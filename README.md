# Wall Sense

A Connect IQ watch-app for the **Garmin Forerunner 165** that turns the watch's
triaxial magnetometer into a simple magnetic anomaly detector. It shows the
deviation from a calibrated ambient field and gives escalating haptic feedback
as the deviation grows.

> **Safety notice:** This is a hobby/experiment app, not a professional
> live-wire, stud-finder or safety instrument. Do not use it to decide whether a
> circuit is safe to touch, to locate buried utilities, or for any task where a
> false reading could cause injury or damage.

---

## Features

- Triaxial magnetometer sampling through `Sensor.registerSensorDataListener()`
  at the highest rate reported by
  `Sensor.getMaxSampleRateForSensorType(:magnetometer)`. The rate is refreshed
  whenever the app becomes active, because the sensor API may report a
  different maximum before and after an active/inactive transition.
- 1-second sample batches at the maximum supported rate. The Sensor API's
  `:period` is an integer number of seconds, so one second is the shortest
  batch window; every sample inside the batch is still processed. A 25 Hz
  registration is retried if the firmware rejects the maximum rate. A 50 ms
  timer drives the display animation and the haptic sequencer.
- 0.7-second settle delay, then a 3-second baseline calibration using Welford
  online mean/variance. Calibration restarts if the hand moves.
- Adaptive anomaly threshold relative to the ambient field:
  `4 * sigma + 1% of ambient`, never below **2.5% of ambient** (~12 mG).
- Two detectors combined into one score:
  - steady change: `delta = abs(sqrt(x*x + y*y + z*z) - baseline)`;
  - AC ripple from live cables: RMS of the high-passed magnitude, threshold
    3x the quiet-room ripple (at least 0.4% of ambient, ~2 mG).
- Entry requires ~0.15 s above the threshold; release requires ~0.5 s under
  65% of it.
- Samples taken while the vibration motor runs are ignored, so the motor's
  magnet cannot trigger detections by itself.
- The accelerometer detects wrist tilt (>15 degrees) and the baseline is
  re-learned automatically once the hand is steady again.
- While nothing is detected, the baseline slowly tracks drift (~20 s).
- Dynamic haptics with eight cached `Attention.VibeProfile` patterns:
  - repetition interval: **1000 ms -> 600 ms** as the anomaly grows;
  - pulse envelope: **50 ms -> 150 ms**;
  - duty cycle: **35% -> 100%** (mapped for API completeness);
  - levels 4-7 split the envelope into a main pulse plus a shorter echo,
    separated by a 30 ms gap.
- Pure-black AMOLED UI with a 270-degree gauge, dim concentric rings, expanding
  radar echoes, large delta readout and threshold display.
- Sensor watchdog and automatic re-registration if data stops for 3.5 s.
- Clean pause/resume/unregister behaviour across app lifecycle callbacks.

---

## Project layout

```
manifest.xml                         App declaration, fr165 target, Sensor permission
monkey.jungle                        Build paths
source/App.mc                        AppBase entry point and lifecycle forwarding
source/Delegate.mc                   Sensor pipeline, calibration, detection, haptics
source/View.mc                       AMOLED view, gauge, radar rings, text
resources/strings/strings.xml        Application name
resources/drawables/drawables.xml    Launcher icon resource
resources/drawables/launcher_icon.png 54 x 54 launcher icon
design/launcher_icon.svg             Editable icon source (not compiled)
```

---

## Requirements

- A current Connect IQ SDK that includes the **Forerunner 165** device files.
  The watch is API level 5.2; use a current SDK (9.x is current at the time of
  writing) installed through the SDK Manager.
- Forerunner 165 device files installed through the SDK Manager.
- A developer key for building and installing (`.der` file).
- Optional: VS Code with the Garmin Monkey C extension.

The project targets only `fr165`. The Forerunner 165 has a 390 x 390 round
AMOLED display and a 786,432-byte watch-app memory limit.

---

## Build and run

### VS Code / Monkey C extension

1. Open this folder as a workspace.
2. Select **Forerunner 165** as the target device.
3. Run **Monkey C: Build for Device** (or **Build and Run**).
4. Start the simulator or connect a watch in developer mode.

### Command line

From the project root, with `monkeyc` and `monkeydo` on `PATH`:

```powershell
# Build
monkeyc -d fr165 -f monkey.jungle -o bin\WallSense.prg -y C:\path\to\developer_key.der

# Run in the simulator
monkeydo bin\WallSense.prg fr165
```

Create the `bin` folder first if your SDK version does not do it automatically.
The exact path to `monkeyc` depends on where the SDK Manager installed the SDK,
for example:

```text
%APPDATA%\Garmin\ConnectIQ\Sdks\connectiq-sdk-win-<version>\bin\monkeyc
```

---

## How to use

1. Launch **Wall Sense** from the watch's Connect IQ app list.
2. During **CALIBRATING**, hold the watch still and keep it away from metal,
   magnets, speakers, motors, chargers and energized wiring for about 4
   seconds, until the double confirmation vibration.
   The gauge fills and the percentage counts up.
3. After calibration, the app scans continuously. The display shows:
   - **SCANNING** in normal conditions;
   - **ANOMALY** when the field deviates past the adaptive threshold;
   - **STRONG SIGNAL** at the highest levels;
   - **SENSOR LOST** with automatic retries if magnetometer data stops.
4. To find cables, keep the watch flat against the wall, a few centimetres
   away, and slide it slowly sideways without turning the wrist. A local
   magnetic distortion or a live cable raises the gauge and changes its color
   from cyan to amber/red. Cables are only detectable while current flows
   through them (switch on a light or appliance on that circuit).
5. **Tap the screen**, or press **ENTER/START**, to recalibrate at any time.
   Turning the wrist re-learns the baseline automatically; a full recalibration
   is only needed when you move to another room.

### Reading the display

- **Large number**: current smoothed absolute field deviation in milligauss
  (mG).
- **mG**: unit label.
- **TH x.x**: adaptive anomaly threshold calculated during calibration.
- **Gauge**: combined score (the larger of `delta / threshold` and
  `ripple / ripple threshold`) on a scale that reaches full at roughly
  `3 x threshold`.
- **Rings**: slow ambient echoes while scanning; they speed up and brighten as
  the anomaly level rises.

---

## How the detection works

The magnetometer measures the total local magnetic field vector
`(x, y, z)` in milliGauss. The app computes the vector magnitude:

```text
magnitude = sqrt(x*x + y*y + z*z)
delta     = abs(magnitude - baseline)
```

The baseline is the mean magnitude observed during the 3-second calibration.
The threshold is derived from the standard deviation of those calibration
samples plus a share of the ambient field, so a noisy environment gets a wider
margin but a quiet one never gets a hair-trigger threshold.

Live cables are detected separately. Mains current alternates at 50/60 Hz;
sampled at ~25 Hz it aliases into a fast fluctuation of the magnitude even
when the average barely changes. The app subtracts a ~0.3 s running mean and
tracks the RMS of what remains:

```text
residual = magnitude - running_mean
ripple   = sqrt(running_mean(residual^2))
score    = max(delta / threshold, ripple / ripple_threshold)
```

This means the app reacts to changes in the **total field strength**, not to a
particular direction. A nearby ferromagnetic object (iron, steel, nickel, some
stainless steels) distorts the field and changes the magnitude. A wire carrying
alternating current also produces an alternating field that can be detected as
a changing magnitude.

---

## Haptic mapping

The app normalizes the excess deviation above the threshold:

```text
n = clamp((delta / threshold - 1) / 7, 0, 1)
```

Eight levels are cached at startup (`n = level / 7`):

| Level | Interval | Main pulse | Echo | Gap | Duty | Pattern |
|------:|---------:|-----------:|-----:|----:|-----:|---------|
| 0 | 1000 ms | 50 ms | — | — | 35% | single |
| 1 | 923 ms | 64 ms | — | — | 44% | single |
| 2 | 862 ms | 78 ms | — | — | 53% | single |
| 3 | 805 ms | 92 ms | — | — | 62% | single |
| 4 | 751 ms | 66 ms | 36 ms | 30 ms | 72% | double |
| 5 | 699 ms | 75 ms | 41 ms | 30 ms | 81% | double |
| 6 | 649 ms | 83 ms | 45 ms | 30 ms | 90% | double |
| 7 | 600 ms | 93 ms | 51 ms | 30 ms | 100% | double |

The interval formula is `1000 - 400 * n^0.85` ms, kept long enough to leave
motor-off samples between pulses. The pulse envelope is
`50 + 100 * n` ms; levels 4-7 use 62% of that envelope for the main pulse and
34% for the echo. All values in the table are the truncated integers actually
cached by the app. Higher levels therefore pulse faster, longer and with a more
urgent double-pulse structure.

### Forerunner vibration behaviour

Garmin documents that **Forerunner devices do not support vibration patterns**:
`Attention.vibrate()` still works, but the motor runs at a fixed duty cycle.
The app sends real `VibeProfile` arrays and maps duty cycle correctly for devices
that support it. On the Forerunner 165, the perceived difference comes mainly
from pulse length, repetition interval and the single/double-pulse structure.
Short `0`-duty gap profiles are used to separate the two pulses; if the
firmware chooses to ignore duty cycle entirely, the result is simply a stronger
continuous-feeling pulse rather than a silent gap.

---

## Permissions and the missing "Vibrate" permission

The manifest requests only:

```xml
<iq:uses-permission id="Sensor"/>
```

There is **no `Vibrate` permission** in the Connect IQ permission list.
`Toybox.Attention` is available to watch-apps, data fields and widgets without a
separate manifest permission, and vibration only works while the app is in the
foreground. Adding `<iq:uses-permission id="Vibrate"/>` would make the manifest
invalid. This is why the manifest contains only `Sensor`.

---

## Limitations

- **Magnitude, not direction.** The app compares total field strength. Rotating
  the watch can change the reading slightly because real sensors have hard-iron
  offsets. Tilting is detected with the accelerometer and the baseline is
  re-learned, but turning the watch flat (around the vertical axis) is not
  seen by the accelerometer, so keep that orientation stable while scanning.
- **Ferromagnetic metals only.** Copper, aluminium, brass, gold and most
  non-magnetic materials are invisible unless they carry current. A live AC
  wire can be detected; a dead wire usually cannot. In a two-conductor cable
  the currents partly cancel, so the field is weak: expect a range of a few
  centimetres, and better results with a load switched on.
- **Distance matters.** Field strength falls quickly with distance. Detection
  range depends on the object's size, orientation and magnetic properties, and
  on the local Earth field.
- **Environmental noise.** Speakers, magnets, laptop lids, chargers, metal
  furniture and the watch's own strap/charger can dominate the reading.
  Recalibrate in the environment you want to inspect.
- **No absolute measurement.** The displayed delta is relative to the baseline
  established during calibration, not a calibrated physical field value.
- **Batching latency.** The Sensor API accepts an integer `:period` in seconds,
  so samples arrive in one-second batches. A new anomaly can take up to about a
  second to affect the display and haptics, even though the UI animates at 20 Hz.
- **Not a safety device.** See the safety notice at the top.

---

## Troubleshooting

| Symptom | What to try |
|---|---|
| Stuck on CALIBRATING | Move away from metal, hold still, check that the Sensor permission was granted at install. |
| SENSOR LOST | Tap to retry; make sure no other sensor-heavy app is running; restart the watch if it persists. |
| Triggering with no metal nearby | Recalibrate; avoid rotating the wrist flat; move away from speakers, chargers and metal desks. |
| Misses a cable | Switch on a load on that circuit, recalibrate a short distance from the wall, then slide slowly with the watch flat against it. |
| No vibration | Confirm the app is in the foreground and that vibration is enabled on the watch. Forerunners use a fixed vibration duty cycle. |
| Delta drifts over time | Recalibrate; ambient field and sensor offset can change with orientation and temperature. |

---

## Development notes

- The code follows the current listener API: `SensorData.magnetometerData` has
  `x`, `y` and `z` as **arrays** of mG values. Every array is null-checked and
  length-checked before use.
- `Sensor.unregisterSensorDataListener()` is always called on pause and exit.
- All calibration and detection math is real; there is no mocked sensor data or
  fabricated vibration math.
- The view never registers sensors or starts timers. It only reads getters from
  `WallSenseDelegate`.
- The 50 ms timer drives UI updates and the haptic sequencer. The sensor callback
  processes every sample and updates detection state.

## Build status

The project compiles cleanly with Connect IQ SDK 9.3.0 targeting `fr165`
(`monkeyc -d fr165 -f monkey.jungle -o bin\WallSense.prg -y ... -w`).
The signed build is included at `bin/WallSense.prg`.
Runtime validation on a physical Forerunner 165 is still required. The local
Connect IQ simulator crashed while loading even a minimal FR165 test app in this
environment, so the UI and vibration behaviour have not been verified here; test
both on real hardware before distributing the app.
