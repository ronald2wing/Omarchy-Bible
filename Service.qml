import QtQuick
import Quickshell

// Shared state for the Bible plugin. Panel.qml resolves the day's verse from
// the bundled translations; this service supplies the date key that changes at
// midnight (so the panel picks a new random verse each day) and carries the
// resolved reference back for the bar tooltip.
Item {
  id: root

  // --- verse of the day ----------------------------------------------------

  // Date string that rolls over at midnight; Panel.qml picks a random verse
  // when this key changes. Initialized here (rather than only in
  // onDateChanged) so it is available before the first date change fires.
  property string todayKey: ""

  // Written by Panel.qml once it resolves the day's reference; read by
  // BarWidget.qml's tooltip. Empty until the panel has picked one.
  property string todayReference: ""

  function dateKeyFor(date) {
    return Qt.formatDateTime(date, "yyyy-MM-dd")
  }

  SystemClock {
    id: clock
    precision: SystemClock.Minutes
    onDateChanged: root.todayKey = root.dateKeyFor(clock.date)
  }

  Component.onCompleted: {
    root.todayKey = root.dateKeyFor(clock.date)
  }
}
