//
// Wall Sense
// AMOLED watch-app UI for the Forerunner 165 (390 x 390 round).
//
// Design goals:
//   - Pure black background to minimize AMOLED power use.
//   - A 270-degree gauge with a top gap, so the title stays clear.
//   - Dim concentric rings and expanding radar echoes for a fluid,
//     instrument-like anomaly indicator.
//   - Large numeric delta with a small unit and threshold readout.
//

using Toybox.Graphics as Gfx;
using Toybox.Lang as Lang;
using Toybox.Math as MathModule;
using Toybox.System as Sys;
using Toybox.WatchUi as Ui;

class WallSenseView extends Ui.View {

    private var _delegate;

    // Palette. Bright colors are reserved for the active gauge and the
    // large delta; structural elements stay dark to limit lit pixels.
    private var _colorBg;
    private var _colorText;
    private var _colorDim;
    private var _colorHint;
    private var _colorEdge;
    private var _colorTrack;
    private var _colorCyan;
    private var _colorCyanMid;
    private var _colorCyanDim;
    private var _colorAmber;
    private var _colorAmberMid;
    private var _colorAmberDim;
    private var _colorRed;
    private var _colorRedMid;
    private var _colorRedDim;

    private var _deltaText;
    private var _thresholdLine;
    private var _lastTextUpdate;

    public function initialize(delegate) {
        Ui.View.initialize();

        _delegate = delegate;

        _colorBg = 0x000000;
        _colorText = 0xE8F7F2;
        _colorDim = 0x77A79E;
        _colorHint = 0x3F625B;
        _colorEdge = 0x14332E;
        _colorTrack = 0x163A34;

        _colorCyan = 0x00E6C8;
        _colorCyanMid = 0x0B8A78;
        _colorCyanDim = 0x06443C;

        _colorAmber = 0xFFB020;
        _colorAmberMid = 0xB06A00;
        _colorAmberDim = 0x4A2C00;

        _colorRed = 0xFF4538;
        _colorRedMid = 0xA82A20;
        _colorRedDim = 0x48100C;

        _deltaText = "0.0";
        _thresholdLine = "TH 6.0";
        _lastTextUpdate = 0;
    }

    public function onShow() as Void {
        Ui.requestUpdate();
    }

    public function onUpdate(dc as Gfx.Dc) as Void {
        var width = dc.getWidth();
        var height = dc.getHeight();
        var cx = width / 2;
        var cy = height / 2;
        var now = Sys.getTimer();

        dc.setColor(_colorBg, _colorBg);
        dc.clear();

        if (_delegate.isSensorLost()) {
            drawSensorLost(dc, cx, cy, now);
            return;
        }

        if (_delegate.isCalibrating()) {
            drawCalibration(dc, cx, cy, now);
            return;
        }

        drawMain(dc, cx, cy, now);
    }

    // ---------------------------------------------------------------------
    // Main scanning screen
    // ---------------------------------------------------------------------
    private function drawMain(dc as Gfx.Dc, cx, cy, now) as Void {
        drawFrame(dc, cx, cy);
        drawReactiveRings(dc, cx, cy, now);
        drawGauge(dc, cx, cy);

        // Formatting is throttled to 10 Hz; the gauge and radar rings still
        // animate at the full 20 Hz UI tick.
        if (_lastTextUpdate == 0 || (now - _lastTextUpdate) >= 100) {
            _deltaText = _delegate.getDelta().format("%.1f");
            _thresholdLine = "TH " + _delegate.getThresholdText();
            _lastTextUpdate = now;
        }

        var anomaly = _delegate.isAnomaly();
        var level = _delegate.getLevel();
        var accent = activeColor();

        drawTitle(dc, cx);

        var status;
        var statusColor;
        if (anomaly) {
            if (level >= 4) {
                status = "STRONG SIGNAL";
            } else {
                status = "ANOMALY";
            }
            statusColor = accent;
        } else {
            status = "SCANNING";
            statusColor = _colorDim;
        }

        dc.setColor(statusColor, _colorBg);
        dc.drawText(cx, 88, Gfx.FONT_XTINY, status, centered());

        // The number font is large; drop to FONT_LARGE for values with more
        // than four characters so the readout never fights the inner rings.
        var deltaFont = Gfx.FONT_NUMBER_MILD;
        if (_deltaText.length() > 4) {
            deltaFont = Gfx.FONT_LARGE;
        }

        dc.setColor(anomaly ? accent : _colorText, _colorBg);
        dc.drawText(cx, 190, deltaFont, _deltaText, centered());

        dc.setColor(_colorDim, _colorBg);
        dc.drawText(cx, 254, Gfx.FONT_TINY, "mG", centered());
        dc.drawText(cx, 290, Gfx.FONT_XTINY, _thresholdLine, centered());

        dc.setColor(_colorHint, _colorBg);
        dc.drawText(cx, 326, Gfx.FONT_XTINY, "TAP TO RECAL", centered());
    }

    // ---------------------------------------------------------------------
    // Calibration screen
    // ---------------------------------------------------------------------
    private function drawCalibration(dc as Gfx.Dc, cx, cy, now) as Void {
        drawFrame(dc, cx, cy);

        var progress = _delegate.getCalibrationProgress();
        dc.setPenWidth(8);
        dc.setColor(_colorCyan, _colorBg);
        drawGaugeArc(dc, cx, cy, 158, progress);
        drawArcEndDot(dc, cx, cy, 158, progress, _colorCyan);

        drawTitle(dc, cx);

        dc.setColor(_colorDim, _colorBg);
        dc.drawText(cx, 126, Gfx.FONT_SMALL, "CALIBRATING", centered());

        var percent = (progress * 100.0).toNumber();
        var percentText = percent.toString() + "%";

        dc.setColor(_colorText, _colorBg);
        dc.drawText(cx, 196, Gfx.FONT_LARGE, percentText, centered());
        dc.drawText(cx, 260, Gfx.FONT_TINY, "HOLD STILL", centered());

        dc.setColor(_colorDim, _colorBg);
        dc.drawText(cx, 296, Gfx.FONT_XTINY, "AWAY FROM METAL", centered());

        dc.setColor(_colorHint, _colorBg);
        dc.drawText(cx, 328, Gfx.FONT_XTINY, "TAP TO RESTART", centered());
    }

    // ---------------------------------------------------------------------
    // Sensor-loss screen
    // ---------------------------------------------------------------------
    private function drawSensorLost(dc as Gfx.Dc, cx, cy, now) as Void {
        drawFrame(dc, cx, cy);

        var phase = ((now % 1600).toFloat()) / 1600.0;
        var radius = (118.0 + 27.0 * phase).toNumber();

        dc.setColor(_colorRedDim, _colorBg);
        dc.setPenWidth(1);
        drawGaugeArc(dc, cx, cy, radius, 1.0);

        drawTitle(dc, cx);

        dc.setColor(_colorRed, _colorBg);
        dc.drawText(cx, 164, Gfx.FONT_MEDIUM, "SENSOR LOST", centered());

        dc.setColor(_colorDim, _colorBg);
        dc.drawText(cx, 236, Gfx.FONT_TINY, "RETRYING...", centered());

        dc.setColor(_colorHint, _colorBg);
        dc.drawText(cx, 326, Gfx.FONT_XTINY, "TAP TO RETRY", centered());
    }

    // ---------------------------------------------------------------------
    // Shared instrument frame
    // ---------------------------------------------------------------------
    private function drawFrame(dc as Gfx.Dc, cx, cy) as Void {
        dc.setPenWidth(1);
        dc.setColor(_colorEdge, _colorBg);

        // Thin outer bezel ring.
        dc.drawCircle(cx, cy, 181);

        // Concentric rings share the gauge's top gap, keeping the title and
        // status text free of lines.
        drawGaugeArc(dc, cx, cy, 134, 1.0);
        drawGaugeArc(dc, cx, cy, 112, 1.0);

        // Tick marks only along the live 270-degree gauge sector.
        for (var i = 0; i <= 18; i += 1) {
            var degrees = 45.0 - i * 15.0;
            var radians = degrees * MathModule.PI / 180.0;
            var cosValue = MathModule.cos(radians);
            var sinValue = MathModule.sin(radians);

            var x1 = (cx + cosValue * 168.0).toNumber();
            var y1 = (cy - sinValue * 168.0).toNumber();
            var x2 = (cx + cosValue * 175.0).toNumber();
            var y2 = (cy - sinValue * 175.0).toNumber();

            dc.drawLine(x1, y1, x2, y2);
        }

        // Dark gauge track.
        dc.setPenWidth(8);
        dc.setColor(_colorTrack, _colorBg);
        drawGaugeArc(dc, cx, cy, 158, 1.0);
    }

    // ---------------------------------------------------------------------
    // Radar echoes (concentric circles) that react to the anomaly level
    // ---------------------------------------------------------------------
    private function drawReactiveRings(dc as Gfx.Dc, cx, cy, now) as Void {
        var anomaly = _delegate.isAnomaly();
        var level = _delegate.getLevel();

        var period = 1800;
        if (anomaly) {
            period = 760 - level * 35;
            if (period < 480) {
                period = 480;
            }
        }

        var phase = ((now % period).toFloat()) / period.toFloat();

        for (var i = 0; i < 2; i += 1) {
            var p = phase + i * 0.5;
            if (p >= 1.0) {
                p -= 1.0;
            }

            var radius = (118.0 + 27.0 * p).toNumber();
            var color = ringColor(p, anomaly, level);

            dc.setColor(color, _colorBg);
            dc.setPenWidth(anomaly ? 2 : 1);
            drawGaugeArc(dc, cx, cy, radius, 1.0);
        }
    }

    private function ringColor(phase as Lang.Float, anomaly as Lang.Boolean, level as Lang.Number) {
        if (anomaly) {
            if (level >= 5) {
                if (phase < 0.34) {
                    return _colorRedMid;
                } else if (phase < 0.67) {
                    return _colorRedDim;
                }
                return _colorEdge;
            }

            if (phase < 0.34) {
                return _colorAmberMid;
            } else if (phase < 0.67) {
                return _colorAmberDim;
            }
            return _colorEdge;
        }

        if (phase < 0.34) {
            return _colorCyanMid;
        } else if (phase < 0.67) {
            return _colorCyanDim;
        }
        return _colorEdge;
    }

    // ---------------------------------------------------------------------
    // Gauge
    // ---------------------------------------------------------------------
    private function drawGauge(dc as Gfx.Dc, cx, cy) as Void {
        var ratio = _delegate.getRatio();
        var progress = ratio / 3.0;

        if (progress <= 0.0) {
            return;
        }
        if (progress > 1.0) {
            progress = 1.0;
        }

        var color = activeColor();
        dc.setColor(color, _colorBg);
        dc.setPenWidth(8);
        drawGaugeArc(dc, cx, cy, 158, progress);
        drawArcEndDot(dc, cx, cy, 158, progress, color);
    }

    // The gauge uses a 270-degree sweep. Angles in the Connect IQ Dc API
    // increase counter-clockwise (0 = 3 o'clock, 90 = 12 o'clock), and
    // ARC_CLOCKWISE moves from the start angle toward a smaller angle.
    // Starting at 45 degrees and ending at 135 degrees leaves a 90-degree
    // gap centered on 12 o'clock.
    private function drawGaugeArc(dc as Gfx.Dc, cx, cy, radius, fraction) as Void {
        if (fraction <= 0.002) {
            return;
        }
        if (fraction > 1.0) {
            fraction = 1.0;
        }

        var end = 45.0 - 270.0 * fraction;
        while (end < 0.0) {
            end += 360.0;
        }

        // drawArc() truncates fractional degrees; pass an integer explicitly
        // so the endpoint matches the computed arc length.
        dc.drawArc(cx, cy, radius, Gfx.ARC_CLOCKWISE, 45, end.toNumber());
    }

    private function drawArcEndDot(dc as Gfx.Dc, cx, cy, radius, fraction, color) as Void {
        if (fraction <= 0.02) {
            return;
        }

        var degrees = 45.0 - 270.0 * fraction;
        var radians = degrees * MathModule.PI / 180.0;
        var x = (cx + MathModule.cos(radians) * radius).toNumber();
        var y = (cy - MathModule.sin(radians) * radius).toNumber();

        dc.setColor(color, _colorBg);
        dc.fillCircle(x, y, 6);
    }

    // ---------------------------------------------------------------------
    // Small helpers
    // ---------------------------------------------------------------------
    private function drawTitle(dc as Gfx.Dc, cx) as Void {
        dc.setColor(_colorDim, _colorBg);
        dc.drawText(cx, 52, Gfx.FONT_XTINY, "WALL SENSE", centered());
    }

    private function activeColor() {
        if (!_delegate.isAnomaly()) {
            return _colorCyan;
        }

        if (_delegate.getLevel() >= 5) {
            return _colorRed;
        }

        return _colorAmber;
    }

    private function centered() {
        return Gfx.TEXT_JUSTIFY_CENTER | Gfx.TEXT_JUSTIFY_VCENTER;
    }
}
