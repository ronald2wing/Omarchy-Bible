import QtQuick
import qs.Commons

// Quiet minimal icon button used for reader navigation and the
// books browser toggle. One control height, transparent until hovered.
Rectangle {
  id: btn

  required property color barForeground
  required property color foreground
  required property string fontFamily

  property string glyph: ""
  property bool active: false
  // Large variant for primary reader navigation: bigger hit target and
  // glyph so chapter paging is easy to hit.
  property bool large: false
  signal clicked()

  width: btn.large ? Style.space(40) : Style.spacing.controlHeight
  height: btn.large ? Style.space(40) : Style.spacing.controlHeight
  radius: Style.cornerRadius
  color: btn.active
    ? Style.selectedFillFor(btn.barForeground, Color.accent)
    : (btnMouse.containsMouse ? Style.hoverFillFor(btn.barForeground, Color.accent) : "transparent")

  Text {
    anchors.centerIn: parent
    text: btn.glyph
    textFormat: Text.PlainText
    color: btn.active ? Color.accent : btn.foreground
    font.family: btn.fontFamily
    font.pixelSize: btn.large ? Style.font.iconLarge : Style.font.body
  }

  MouseArea {
    id: btnMouse
    anchors.fill: parent
    hoverEnabled: true
    cursorShape: Qt.PointingHandCursor
    onClicked: btn.clicked()
  }
}
