//
// Wall Sense
// Application entry point.
//
// The app is a watch-app for the Forerunner 165. The delegate owns the
// magnetometer pipeline, calibration and haptics; the view only renders
// the delegate's public state. Both objects are created once so lifecycle
// callbacks and input events always share the same instance.
//

using Toybox.Application as App;
using Toybox.Lang as Lang;
using Toybox.WatchUi as Ui;

class WallSenseApp extends App.AppBase {

    private var _delegate;
    private var _view;

    public function initialize() {
        App.AppBase.initialize();

        _delegate = new WallSenseDelegate();
        _view = new WallSenseView(_delegate);
    }

    public function onStart(state as Lang.Dictionary?) as Void {
        _delegate.startSession();
    }

    public function onActive(state as Lang.Dictionary?) as Void {
        _delegate.resumeSession();
    }

    public function onInactive(state as Lang.Dictionary?) as Void {
        _delegate.pauseSession();
    }

    public function onStop(state as Lang.Dictionary?) as Void {
        _delegate.shutdown();
    }

    public function getInitialView() {
        return [_view, _delegate];
    }
}
