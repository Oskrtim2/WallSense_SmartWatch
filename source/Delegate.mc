//
// Wall Sense
// Magnetometer pipeline, calibration, anomaly detection and haptics.
//
// Detection model:
//   1. Wait 0.7 s for the hand to settle, then calibrate for 3 seconds and
//      learn the ambient total field strength.
//   2. delta = |sqrt(x^2 + y^2 + z^2) - baseline|
//   3. The threshold is relative to the ambient field (at least 5 %) plus
//      5 sigma of the noise measured during calibration.
//   4. The deviation must last ~0.25 s to trigger and ~0.5 s to release.
//   5. Samples taken while the vibration motor runs are ignored: the motor
//      has a magnet and would otherwise trigger itself in a loop.
//   6. When the watch tilts (accelerometer) the baseline is re-learned,
//      because turning the wrist changes the reading on its own.
//   7. While there is no anomaly, the baseline slowly follows the field to
//      absorb drift.
//   8. Haptic repetition, pulse width and pattern complexity grow with delta.
//

using Toybox.Attention as AttentionModule;
using Toybox.Lang as Lang;
using Toybox.Math as MathModule;
using Toybox.Sensor as SensorModule;
using Toybox.System as Sys;
using Toybox.Timer as TimerModule;
using Toybox.WatchUi as Ui;

class WallSenseDelegate extends Ui.InputDelegate {

    // ---------------------------------------------------------------------
    // Tuning
    // ---------------------------------------------------------------------
    private var _calibrationMs;
    private var _uiTickMs;
    private var _sensorTimeoutMs;
    private var _sensorRetryMs;

    // ---------------------------------------------------------------------
    // Session state
    // ---------------------------------------------------------------------
    private var _started;
    private var _paused;
    private var _shutdown;

    // ---------------------------------------------------------------------
    // Sensor state
    // ---------------------------------------------------------------------
    private var _sensorRegistered;
    private var _sensorCallback;
    private var _sampleRate;
    private var _lastSampleTime;
    private var _sensorLost;
    private var _retryAt;

    // ---------------------------------------------------------------------
    // Calibration and detection state
    // ---------------------------------------------------------------------
    private var _calibrating;
    private var _hasBaseline;
    private var _calibrationStart;
    private var _calibCount;
    private var _calibMean;
    private var _calibM2;
    private var _baseline;
    private var _threshold;
    private var _thresholdText;
    private var _delta;
    private var _overCount;
    private var _underCount;
    private var _anomaly;
    private var _level;
    private var _calibSettleMs;
    private var _triggerSamples;
    private var _releaseSamples;
    private var _driftAlpha;

    // ---------------------------------------------------------------------
    // Orientation state (accelerometer)
    // ---------------------------------------------------------------------
    private var _useAccel;
    private var _refGx;
    private var _refGy;
    private var _refGz;
    private var _hasRef;
    private var _needsRebase;
    private var _batchGx;
    private var _batchGy;
    private var _batchGz;
    private var _batchHasG;

    // ---------------------------------------------------------------------
    // Vibration blanking: recent motor-on windows [start, end] in ms
    // ---------------------------------------------------------------------
    private var _blankStart as Lang.Array;
    private var _blankEnd as Lang.Array;
    private var _blankIdx;

    // ---------------------------------------------------------------------
    // Haptic state
    // ---------------------------------------------------------------------
    private var _hapticsOk;
    private var _patterns as Lang.Array;
    private var _intervals as Lang.Array;
    private var _confirmPattern;
    private var _nextVibeAt;

    // ---------------------------------------------------------------------
    // UI timer
    // ---------------------------------------------------------------------
    private var _timer;
    private var _timerRunning;
    private var _tickCallback;

    public function initialize() {
        Ui.InputDelegate.initialize();

        _calibrationMs = 3000;
        _uiTickMs = 50;
        _sensorTimeoutMs = 3500;
        _sensorRetryMs = 3000;

        _started = false;
        _paused = false;
        _shutdown = false;

        _sensorRegistered = false;
        _sensorCallback = method(:onSensorData);
        _sampleRate = 25;
        _lastSampleTime = 0;
        _sensorLost = false;
        _retryAt = 0;

        _calibrating = false;
        _hasBaseline = false;
        _calibrationStart = 0;
        _calibCount = 0;
        _calibMean = 0.0;
        _calibM2 = 0.0;
        _baseline = 0.0;
        _threshold = 6.0;
        _thresholdText = "6.0";
        _delta = 0.0;
        _overCount = 0;
        _underCount = 0;
        _anomaly = false;
        _level = 0;
        _calibSettleMs = 700;
        _triggerSamples = 6;
        _releaseSamples = 12;
        _driftAlpha = 0.004;

        _useAccel = true;
        _refGx = 0.0;
        _refGy = 0.0;
        _refGz = 0.0;
        _hasRef = false;
        _needsRebase = false;
        _batchGx = 0.0;
        _batchGy = 0.0;
        _batchGz = 0.0;
        _batchHasG = false;

        _blankStart = [0, 0, 0, 0, 0, 0];
        _blankEnd = [0, 0, 0, 0, 0, 0];
        _blankIdx = 0;

        _hapticsOk = true;
        _patterns = new [8];
        _intervals = new [8];
        _confirmPattern = null;
        _nextVibeAt = 0;

        _timer = null;
        _timerRunning = false;
        _tickCallback = method(:onTick);

        buildHapticTable();
    }

    // ---------------------------------------------------------------------
    // Application lifecycle
    // ---------------------------------------------------------------------
    public function startSession() as Void {
        _shutdown = false;
        _started = true;
        _paused = false;

        if (!_timerRunning) {
            startUiTimer();
        }

        if (!_sensorRegistered) {
            registerSensor();
        }

        beginCalibration();
    }

    public function resumeSession() as Void {
        if (!_started || _shutdown) {
            return;
        }

        // onActive() can be called on the initial launch as well as when
        // returning from the inactive state. On the initial call the session
        // is already running, but the maximum sensor rate may change once the
        // app is truly active, so refresh it before continuing.
        if (!_paused) {
            refreshSampleRate();

            if (!_timerRunning) {
                startUiTimer();
            }
            return;
        }

        _paused = false;

        if (!_timerRunning) {
            startUiTimer();
        }

        if (!_sensorRegistered) {
            _sensorLost = false;
            _retryAt = 0;
            registerSensor();
        }

        if (!_hasBaseline) {
            beginCalibration();
        }

        Ui.requestUpdate();
    }

    // getMaxSampleRateForSensorType() is documented to return different
    // results before and after the active/inactive transition. Re-register
    // the listener when the reported maximum changes so the app really uses
    // the best available rate.
    private function refreshSampleRate() as Void {
        var rate = resolveMaxSampleRate();
        if (rate == _sampleRate) {
            return;
        }

        _sampleRate = rate;

        if (_sensorRegistered) {
            var wasCalibrating = _calibrating;

            unregisterSensor();
            registerSensor();

            if (wasCalibrating) {
                beginCalibration();
            }
        }
    }

    public function pauseSession() as Void {
        if (!_started || _paused) {
            return;
        }

        _paused = true;
        stopUiTimer();
        unregisterSensor();

        _anomaly = false;
        _level = 0;
        _nextVibeAt = 0;

        // A calibration interrupted by an overlay is not trustworthy.
        if (_calibrating) {
            _calibrating = false;
            _hasBaseline = false;
        }
    }

    public function shutdown() as Void {
        _shutdown = true;
        _started = false;
        _paused = false;
        _calibrating = false;
        _anomaly = false;
        _level = 0;
        _nextVibeAt = 0;

        stopUiTimer();
        unregisterSensor();
    }

    // ---------------------------------------------------------------------
    // Sensor registration and recovery
    // ---------------------------------------------------------------------
    private function resolveMaxSampleRate() {
        var rate = 25;

        try {
            var maxRate = SensorModule.getMaxSampleRateForSensorType(:magnetometer);
            if (maxRate != null && maxRate > 0) {
                rate = maxRate;
            }
        } catch (e) {
            rate = 25;
        }

        return rate;
    }

    private function registerSensor() as Void {
        // Resolve on every (re)registration. The value can change when the
        // app becomes active again after being inactive.
        _sampleRate = resolveMaxSampleRate();

        var now = Sys.getTimer();
        _lastSampleTime = now;
        _retryAt = now + _sensorRetryMs;

        // The period is an integer number of seconds (1..4), so the
        // smallest possible batch window is one second. The batch still
        // contains samples taken at the full requested rate, and every
        // sample is processed by the detection code below.
        // Try magnetometer + accelerometer first, then fall back to a lower
        // rate, and finally to the magnetometer alone.
        var ok = tryRegister(_sampleRate, true);
        if (!ok && _sampleRate > 25) {
            ok = tryRegister(25, true);
            if (ok) {
                _sampleRate = 25;
            }
        }
        if (!ok) {
            ok = tryRegister(_sampleRate, false);
        }
        if (!ok && _sampleRate > 25) {
            ok = tryRegister(25, false);
            if (ok) {
                _sampleRate = 25;
            }
        }

        if (ok) {
            updateRateDependentTuning();
            return;
        }

        _sensorRegistered = false;
        _sensorLost = true;
        _retryAt = Sys.getTimer() + _sensorRetryMs;
    }

    // Persistence windows are defined in time, so convert them to samples.
    private function updateRateDependentTuning() as Void {
        var rate = _sampleRate;
        if (rate == null || rate <= 0) {
            rate = 25;
        }

        _triggerSamples = (rate * 0.25 + 0.5).toNumber();
        if (_triggerSamples < 3) {
            _triggerSamples = 3;
        }

        _releaseSamples = (rate * 0.5 + 0.5).toNumber();
        if (_releaseSamples < 5) {
            _releaseSamples = 5;
        }

        // About a 10 second time constant for baseline drift tracking.
        _driftAlpha = 1.0 / (rate * 10.0);
    }

    private function tryRegister(rate as Lang.Number, withAccel as Lang.Boolean) as Lang.Boolean {
        try {
            var options = {
                :period => 1,
                :magnetometer => {
                    :enabled => true,
                    :sampleRate => rate
                }
            };
            if (withAccel) {
                options[:accelerometer] = {
                    :enabled => true,
                    :sampleRate => 25
                };
            }
            SensorModule.registerSensorDataListener(_sensorCallback, options);
            _sensorRegistered = true;
            _useAccel = withAccel;
            return true;
        } catch (e) {
            Sys.println("Magnetometer listener registration failed");

            // Clean up in case the failed request was partially accepted
            // before it threw.
            try {
                SensorModule.unregisterSensorDataListener();
            } catch (cleanupError) {
                // Nothing was registered.
            }

            _sensorRegistered = false;
            return false;
        }
    }

    private function unregisterSensor() as Void {
        if (_sensorRegistered) {
            try {
                SensorModule.unregisterSensorDataListener();
            } catch (e) {
                Sys.println("Magnetometer unregister failed");
            }
        }

        _sensorRegistered = false;
    }

    // ---------------------------------------------------------------------
    // Raw sensor callback
    // ---------------------------------------------------------------------
    public function onSensorData(sensorData as SensorModule.SensorData) as Void {
        if (_paused || !_started || _shutdown) {
            return;
        }

        if (!(sensorData has :magnetometerData)) {
            return;
        }

        var magData = sensorData.magnetometerData;
        if (magData == null) {
            return;
        }

        var xs = magData.x;
        var ys = magData.y;
        var zs = magData.z;

        if (xs == null || ys == null || zs == null) {
            return;
        }

        var count = xs.size();
        if (ys.size() < count) {
            count = ys.size();
        }
        if (zs.size() < count) {
            count = zs.size();
        }
        if (count <= 0) {
            return;
        }

        var now = Sys.getTimer();

        // If data resumes in the middle of calibration, discard the stale
        // partial average and start the 3-second window again.
        if (_sensorLost && _calibrating) {
            _calibCount = 0;
            _calibMean = 0.0;
            _calibM2 = 0.0;
            _calibrationStart = now;
        }

        // Orientation check for this batch. Returns true when the watch is
        // moving/tilting and detection must be skipped.
        var unsteady = updateOrientation(sensorData);

        // Calibration needs a still hand: restart it if the watch moved.
        if (_calibrating && unsteady) {
            _calibCount = 0;
            _calibMean = 0.0;
            _calibM2 = 0.0;
            _calibrationStart = now;
        }

        // Samples arrive in ~1 s batches. Estimate when each sample was taken
        // (the last one is roughly "now") so vibration windows can be masked.
        var rate = _sampleRate;
        if (rate == null || rate <= 0) {
            rate = 25;
        }
        var stepMs = 1000.0 / rate;

        var processed = 0;
        var rebaseSum = 0.0;
        var rebaseCount = 0;

        for (var i = 0; i < count; i += 1) {
            var x = xs[i];
            var y = ys[i];
            var z = zs[i];

            if (x == null || y == null || z == null) {
                continue;
            }

            var magnitude = MathModule.sqrt((x * x + y * y + z * z).toFloat());

            // This form also rejects NaN values from bad sensor samples.
            if (!(magnitude > 0.0)) {
                continue;
            }

            processed += 1;

            var sampleTime = now - ((count - 1 - i) * stepMs).toNumber();

            // The vibration motor's magnet disturbs the magnetometer.
            if (isBlanked(sampleTime)) {
                continue;
            }

            if (_calibrating) {
                if (sampleTime - _calibrationStart >= _calibSettleMs) {
                    addCalibrationSample(magnitude);
                }
                continue;
            }

            if (unsteady || _needsRebase) {
                rebaseSum += magnitude;
                rebaseCount += 1;
                continue;
            }

            processSample(magnitude);
        }

        // The watch was tilted: re-learn the baseline from this batch once
        // the hand is steady again, keeping the calibrated threshold.
        if (!_calibrating && _hasBaseline) {
            if (unsteady) {
                _needsRebase = true;
                _anomaly = false;
                _level = 0;
                _overCount = 0;
                _underCount = 0;
                _nextVibeAt = 0;
            } else if (_needsRebase && rebaseCount > 0) {
                _baseline = rebaseSum / rebaseCount;
                _delta = 0.0;
                _needsRebase = false;
                setReferenceFromBatch();
            }
        }

        // Only valid samples count as "sensor alive". A callback full of
        // null/zero values must not hide a dead magnetometer from the
        // watchdog.
        if (processed > 0) {
            _sensorLost = false;
            _lastSampleTime = now;
        }
    }

    // ---------------------------------------------------------------------
    // Calibration and detection math
    // ---------------------------------------------------------------------
    private function beginCalibration() as Void {
        _calibrating = true;
        _hasBaseline = false;

        _calibCount = 0;
        _calibMean = 0.0;
        _calibM2 = 0.0;

        _delta = 0.0;
        _overCount = 0;
        _underCount = 0;
        _anomaly = false;
        _level = 0;
        _nextVibeAt = 0;
        _hasRef = false;
        _needsRebase = false;

        _calibrationStart = Sys.getTimer();
        _lastSampleTime = _calibrationStart;
        // Keep an existing lost-sensor flag. If registration failed, the
        // watchdog/retry path must remain active until a real sample arrives.
    }

    private function addCalibrationSample(magnitude) as Void {
        // Welford online mean/variance: stable and allocation-free.
        _calibCount += 1;
        var delta = magnitude - _calibMean;
        _calibMean += delta / _calibCount;
        _calibM2 += delta * (magnitude - _calibMean);
    }

    // ---------------------------------------------------------------------
    // Orientation (accelerometer)
    // ---------------------------------------------------------------------

    // Computes the mean gravity direction of this batch and returns true if
    // the watch moved: tilt inside the batch, or tilt away from the
    // orientation the baseline was learned in.
    private function updateOrientation(sensorData as SensorModule.SensorData) as Lang.Boolean {
        _batchHasG = false;

        if (!_useAccel || !(sensorData has :accelerometerData)) {
            return false;
        }

        var acc = sensorData.accelerometerData;
        if (acc == null || acc.x == null || acc.y == null || acc.z == null) {
            return false;
        }

        var ax = acc.x;
        var ay = acc.y;
        var az = acc.z;
        var n = ax.size();
        if (ay.size() < n) {
            n = ay.size();
        }
        if (az.size() < n) {
            n = az.size();
        }
        if (n <= 0) {
            return false;
        }

        var sx = 0.0;
        var sy = 0.0;
        var sz = 0.0;
        var used = 0;
        for (var i = 0; i < n; i += 1) {
            if (ax[i] == null || ay[i] == null || az[i] == null) {
                continue;
            }
            sx += ax[i];
            sy += ay[i];
            sz += az[i];
            used += 1;
        }
        if (used == 0) {
            return false;
        }

        var norm = MathModule.sqrt(sx * sx + sy * sy + sz * sz);
        if (!(norm > 0.0)) {
            return false;
        }

        var gx = sx / norm;
        var gy = sy / norm;
        var gz = sz / norm;

        _batchGx = gx;
        _batchGy = gy;
        _batchGz = gz;
        _batchHasG = true;

        // Tilt within the batch: any sample more than ~20 degrees away from
        // the batch mean (cos 20 = 0.94).
        for (var j = 0; j < n; j += 1) {
            if (ax[j] == null || ay[j] == null || az[j] == null) {
                continue;
            }
            var m = MathModule.sqrt((ax[j] * ax[j] + ay[j] * ay[j] + az[j] * az[j]).toFloat());
            if (!(m > 0.0)) {
                continue;
            }
            var dot = (ax[j] * gx + ay[j] * gy + az[j] * gz) / m;
            if (dot < 0.94) {
                return true;
            }
        }

        // Tilt relative to the orientation of the current baseline (~15 deg).
        if (_hasRef && !_calibrating && !_needsRebase) {
            var refDot = gx * _refGx + gy * _refGy + gz * _refGz;
            if (refDot < 0.966) {
                return true;
            }
        }

        return false;
    }

    private function setReferenceFromBatch() as Void {
        if (_batchHasG) {
            _refGx = _batchGx;
            _refGy = _batchGy;
            _refGz = _batchGz;
            _hasRef = true;
        }
    }

    // ---------------------------------------------------------------------
    // Vibration blanking
    // ---------------------------------------------------------------------
    private function addBlankWindow(durationMs) as Void {
        var now = Sys.getTimer();
        // Margins cover batch timestamp jitter and motor spin-down.
        _blankStart[_blankIdx] = now - 100;
        _blankEnd[_blankIdx] = now + durationMs + 200;
        _blankIdx = (_blankIdx + 1) % _blankStart.size();
    }

    private function isBlanked(sampleTime) as Lang.Boolean {
        for (var i = 0; i < _blankStart.size(); i += 1) {
            if (sampleTime >= _blankStart[i] && sampleTime <= _blankEnd[i]) {
                return true;
            }
        }
        return false;
    }


    // ---------------------------------------------------------------------
    // Detection
    // ---------------------------------------------------------------------
    private function processSample(magnitude) as Void {
        if (!_hasBaseline) {
            return;
        }

        var deviation = magnitude - _baseline;
        if (deviation < 0.0) {
            deviation = -deviation;
        }

        // Slowly follow drift (temperature, small posture changes) while
        // nothing is detected. Frozen during an anomaly or near threshold.
        if (!_anomaly && _overCount == 0 && deviation < _threshold * 0.5) {
            _baseline += (magnitude - _baseline) * _driftAlpha;
        }

        // Light smoothing for the numeric readout and the gauge. Detection
        // and haptic level always use the raw deviation.
        _delta += (deviation - _delta) * 0.35;
        if (_delta < 0.0) {
            _delta = 0.0;
        }

        var ratio = deviation / _threshold;

        if (!_anomaly) {
            if (deviation > _threshold) {
                _overCount += 1;
                if (_overCount >= _triggerSamples) {
                    _anomaly = true;
                    _underCount = 0;
                    _nextVibeAt = 0;
                }
            } else {
                _overCount = 0;
            }
        } else {
            // 35% release hysteresis prevents chatter at the threshold.
            if (deviation < _threshold * 0.65) {
                _underCount += 1;
                if (_underCount >= _releaseSamples) {
                    _anomaly = false;
                    _overCount = 0;
                    _underCount = 0;
                    _nextVibeAt = 0;
                }
            } else {
                _underCount = 0;
            }
        }

        if (_anomaly) {
            var normalized = (ratio - 1.0) / 7.0;
            if (normalized < 0.0) {
                normalized = 0.0;
            } else if (normalized > 1.0) {
                normalized = 1.0;
            }

            _level = (normalized * 7.0 + 0.5).toNumber();
            if (_level < 0) {
                _level = 0;
            } else if (_level > 7) {
                _level = 7;
            }
        } else {
            _level = 0;
        }
    }

    private function finalizeCalibration() as Void {
        // Guard against a negative M2 caused by floating-point edge cases;
        // sqrt() of a negative value would produce NaN.
        var variance = 0.0;
        if (_calibCount > 1 && _calibM2 > 0.0) {
            variance = _calibM2 / (_calibCount - 1);
        }

        var sigma = MathModule.sqrt(variance);

        // Relative to the ambient field (Earth ~250..650 mG), so a quiet
        // room never produces a hair-trigger threshold like 2 mG.
        var ambient = _calibMean;
        if (ambient < 0.0) {
            ambient = -ambient;
        }
        var threshold = sigma * 5.0 + ambient * 0.02;
        var minThreshold = ambient * 0.05;
        var maxThreshold = ambient * 0.5;

        if (threshold < minThreshold) {
            threshold = minThreshold;
        }
        if (threshold > maxThreshold) {
            threshold = maxThreshold;
        }
        if (!(threshold > 0.0)) {
            threshold = 25.0;
        }

        _baseline = _calibMean;
        _needsRebase = false;
        setReferenceFromBatch();
        _threshold = threshold;
        _thresholdText = threshold.toFloat().format("%.1f");
        _hasBaseline = true;
        _calibrating = false;

        _delta = 0.0;
        _overCount = 0;
        _underCount = 0;
        _anomaly = false;
        _level = 0;
        _nextVibeAt = 0;

        playConfirmation();
        Ui.requestUpdate();
    }

    public function recalibrate() as Void {
        if (!_started) {
            return;
        }

        _paused = false;

        if (!_timerRunning) {
            startUiTimer();
        }

        if (!_sensorRegistered) {
            _sensorLost = false;
            _retryAt = 0;
            registerSensor();
        }

        beginCalibration();
        _lastSampleTime = Sys.getTimer();
        Ui.requestUpdate();
    }

    // ---------------------------------------------------------------------
    // 50 ms housekeeping tick: watchdog, calibration completion, haptics
    // ---------------------------------------------------------------------
    public function onTick() as Void {
        if (!_started || _paused || _shutdown) {
            return;
        }

        var now = Sys.getTimer();

        // Watchdog: a registered listener that has gone silent for 3.5 s is
        // torn down and retried. This also covers a sensor that registers
        // successfully but never delivers data.
        if (_sensorRegistered && (now - _lastSampleTime) > _sensorTimeoutMs) {
            _sensorLost = true;
            _anomaly = false;
            _level = 0;
            _nextVibeAt = 0;

            unregisterSensor();
            _retryAt = now + _sensorRetryMs;
        }

        if (_sensorLost && !_sensorRegistered && now >= _retryAt) {
            registerSensor();
        }

        if (_calibrating && !_sensorLost) {
            var elapsed = now - _calibrationStart;

            // Two samples are enough for a sample variance. The threshold
            // clamp keeps a very short/noisy window safe, and this avoids
            // getting stuck on firmware that delivers only a few samples.
            if (elapsed >= _calibrationMs + _calibSettleMs && _calibCount >= 2) {
                finalizeCalibration();
            }
        }

        // Haptic sequencer. Patterns are cached by level; the level is
        // recomputed from every sensor sample, so a rising delta both
        // shortens the interval and enriches the pattern in real time.
        if (_anomaly && !_sensorLost) {
            if (_nextVibeAt == 0 || now >= _nextVibeAt) {
                fireHaptic();

                var interval = _intervals[_level] as Lang.Number;
                if (interval == null || interval <= 0) {
                    interval = 500;
                }
                _nextVibeAt = now + interval;
            }
        }

        Ui.requestUpdate();
    }

    // ---------------------------------------------------------------------
    // Haptic table
    // ---------------------------------------------------------------------
    private function buildHapticTable() as Void {
        _patterns = new [8];
        _intervals = new [8];

        for (var i = 0; i < 8; i += 1) {
            var n = i / 7.0;

            // 1000 ms at the threshold, 600 ms at full scale. Kept long
            // enough to leave clean (motor-off) samples between pulses.
            var interval = (1000.0 - 400.0 * MathModule.pow(n, 0.85)).toNumber();
            if (interval < 600) {
                interval = 600;
            } else if (interval > 1000) {
                interval = 1000;
            }
            _intervals[i] = interval;

            // Longer pulses and heavier duty cycle as the anomaly grows.
            var pulse = (50.0 + 100.0 * n).toNumber();
            var duty = (35.0 + 65.0 * n).toNumber();

            if (i >= 4) {
                // High levels get a main pulse plus a shorter echo.
                var mainPulse = (pulse * 0.62).toNumber();
                var echoPulse = (pulse * 0.34).toNumber();
                if (mainPulse < 32) {
                    mainPulse = 32;
                }
                if (echoPulse < 20) {
                    echoPulse = 20;
                }

                _patterns[i] = [
                    new AttentionModule.VibeProfile(duty, mainPulse),
                    new AttentionModule.VibeProfile(0, 30),
                    new AttentionModule.VibeProfile(duty, echoPulse)
                ];
            } else {
                _patterns[i] = [new AttentionModule.VibeProfile(duty, pulse)];
            }
        }

        // Two rising pulses confirm that calibration finished.
        _confirmPattern = [
            new AttentionModule.VibeProfile(80, 90),
            new AttentionModule.VibeProfile(0, 60),
            new AttentionModule.VibeProfile(80, 130)
        ];
    }

    private function fireHaptic() as Void {
        if (!_hapticsOk) {
            return;
        }

        var pattern = _patterns[_level];
        if (pattern == null) {
            return;
        }

        try {
            addBlankWindow(200); // longest level pattern is ~175 ms
            AttentionModule.vibrate(pattern as Lang.Array<AttentionModule.VibeProfile>);
        } catch (e) {
            _hapticsOk = false;
        }
    }

    private function playConfirmation() as Void {
        if (!_hapticsOk) {
            return;
        }

        try {
            addBlankWindow(280); // 90 + 60 + 130 ms
            AttentionModule.vibrate(_confirmPattern);
        } catch (e) {
            _hapticsOk = false;
        }
    }

    // ---------------------------------------------------------------------
    // Timer helpers
    // ---------------------------------------------------------------------
    private function startUiTimer() as Void {
        if (_timer == null) {
            _timer = new TimerModule.Timer();
        }

        if (_timerRunning) {
            return;
        }

        try {
            _timer.start(_tickCallback, _uiTickMs, true);
            _timerRunning = true;
        } catch (e) {
            _timerRunning = false;
            Sys.println("UI timer start failed");
        }
    }

    private function stopUiTimer() as Void {
        if (_timer != null && _timerRunning) {
            try {
                _timer.stop();
            } catch (e) {
                Sys.println("UI timer stop failed");
            }
        }

        _timerRunning = false;
    }

    // ---------------------------------------------------------------------
    // State read by WallSenseView
    // ---------------------------------------------------------------------
    public function isCalibrating() as Lang.Boolean {
        return _calibrating;
    }

    public function isSensorLost() as Lang.Boolean {
        return _sensorLost;
    }

    public function hasBaseline() as Lang.Boolean {
        return _hasBaseline;
    }

    public function isAnomaly() as Lang.Boolean {
        return _anomaly;
    }

    public function getLevel() as Lang.Number {
        return _level;
    }

    public function getDelta() as Lang.Float {
        return _delta.toFloat();
    }

    public function getThreshold() as Lang.Float {
        return _threshold.toFloat();
    }

    public function getThresholdText() as Lang.String {
        return _thresholdText;
    }

    public function getRatio() as Lang.Float {
        if (!_hasBaseline || _threshold <= 0.0) {
            return 0.0;
        }
        return (_delta / _threshold).toFloat();
    }

    public function getCalibrationProgress() as Lang.Float {
        if (!_calibrating) {
            return 1.0;
        }

        var elapsed = Sys.getTimer() - _calibrationStart;
        var progress = elapsed.toFloat() / (_calibrationMs + _calibSettleMs).toFloat();

        if (progress < 0.0) {
            progress = 0.0;
        } else if (progress > 1.0) {
            progress = 1.0;
        }

        return progress;
    }

    // ---------------------------------------------------------------------
    // Input: enter/start or a screen tap restarts calibration
    // ---------------------------------------------------------------------
    public function onKey(keyEvent as Ui.KeyEvent) as Lang.Boolean {
        var key = keyEvent.getKey();

        if (key == Ui.KEY_ENTER || key == Ui.KEY_START) {
            recalibrate();
            return true;
        }

        return false;
    }

    public function onTap(clickEvent as Ui.ClickEvent) as Lang.Boolean {
        recalibrate();
        return true;
    }
}
