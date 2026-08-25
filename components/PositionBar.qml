import QtQuick
import qs.Commons

// Position indicator bar: a track showing where the current item sits
// within a range. Clicking or dragging jumps to the position at that x;
// hovering shows the target in a tooltip.
Rectangle {
  id: positionBar

  required property color foreground
  required property string fontFamily

  property int value: 0
  property int max: 0
  property string labelPrefix: ""
  signal jump(int target)

  function _hoverLabel() {
    return positionBar.labelPrefix + barMouse.hoverValue
  }

  // Verse number at the given x position, clamped to [1, max].
  function valueAt(mx) {
    return Math.max(1, Math.min(positionBar.max, Math.round(mx / width * positionBar.max)))
  }

  width: parent.width
  height: Style.space(10)
  radius: height / 2
  color: Util.alpha(positionBar.foreground, 0.12)

  Rectangle {
    width: positionBar.max > 0 ? parent.width * (positionBar.value / positionBar.max) : 0
    height: parent.height
    radius: height / 2
    color: Color.accent
  }

  MouseArea {
    id: barMouse
    anchors.fill: parent
    hoverEnabled: true
    cursorShape: Qt.PointingHandCursor
    property int hoverValue: positionBar.max > 0 ? positionBar.valueAt(mouseX) : 0
    function jumpTo(mx) {
      if (positionBar.max <= 0) return
      positionBar.jump(positionBar.valueAt(mx))
    }
    onClicked: function(mouse) { jumpTo(mouse.x) }
    onPositionChanged: function(mouse) {
      if (pressed) jumpTo(mouse.x)
    }
  }

  Tooltip {
    visible: barMouse.containsMouse && barMouse.hoverValue > 0
    text: positionBar._hoverLabel()
    fontFamily: positionBar.fontFamily
  }
}
