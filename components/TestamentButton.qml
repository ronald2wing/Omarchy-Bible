import QtQuick
import qs.Commons

// Old/New Testament toggle button in the books browser. Selected state
// mirrors the active testament; width is set by the owning Row (each button
// takes half the row minus half the spacing).
Rectangle {
  id: testament

  required property color barForeground
  required property color foreground
  required property string fontFamily

  property string label: ""
  property bool active: false
  signal clicked()

  height: Style.spacing.controlHeight
  radius: Style.cornerRadius
  color: testament.active
    ? Style.selectedFillFor(testament.barForeground, Color.accent)
    : "transparent"
  border.width: 1
  border.color: testament.active
    ? Color.accent
    : Color.popups.border

  Text {
    anchors.centerIn: parent
    text: testament.label
    textFormat: Text.PlainText
    color: testament.foreground
    font.family: testament.fontFamily
    font.pixelSize: Style.font.bodySmall
    font.bold: testament.active
    elide: Text.ElideRight
  }

  MouseArea {
    anchors.fill: parent
    cursorShape: Qt.PointingHandCursor
    onClicked: testament.clicked()
  }
}
