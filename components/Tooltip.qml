import QtQuick
import QtQuick.Controls as QQC
import qs.Commons

// Hover tooltip shared by the sidebar nav item and the position bar. The
// trigger item owns `visible` and the label text; this file only carries the
// shared look (background, border, font, positioning).
QQC.ToolTip {
  id: tooltip

  property string fontFamily: ""

  delay: 400
  padding: 2
  leftPadding: 6
  rightPadding: 6
  x: (parent.width - tooltip.width) / 2
  y: parent.height + 2

  background: Rectangle {
    color: Color.tooltip.background
    border.width: 1
    border.color: Color.accent
    radius: 0
  }
  contentItem: Text {
    text: tooltip.text
    color: Color.tooltip.text
    font.family: tooltip.fontFamily
    font.pixelSize: Style.font.bodySmall
    horizontalAlignment: Text.AlignHCenter
  }
}
