import QtQuick
import Qt5Compat.GraphicalEffects
import qs.Commons

// Sidebar icon button. Active section shows an accent icon plus a thin
// accent bar on the left edge; inactive sections are muted with a subtle
// hover tint. No borders or boxes.
Rectangle {
  id: nav

  required property color barForeground
  required property color foreground
  required property real opacityPrimary
  required property real opacitySecondary
  required property string fontFamily

  property string iconSource: ""
  property string label: ""
  property bool active: false
  signal clicked()

  height: Style.space(44)
  color: nav.active
    ? Style.selectedFillFor(nav.barForeground, Color.accent)
    : (navMouse.containsMouse ? Style.hoverFillFor(nav.barForeground, Color.accent) : "transparent")

  Rectangle {
    visible: nav.active
    anchors.left: parent.left
    anchors.verticalCenter: parent.verticalCenter
    width: Style.space(2)
    height: Style.space(22)
    radius: width / 2
    color: Color.accent
  }

  ColorOverlay {
    anchors.centerIn: parent
    width: Style.font.iconLarge
    height: Style.font.iconLarge
    color: nav.active ? Color.accent : nav.foreground
    opacity: nav.active ? nav.opacityPrimary : nav.opacitySecondary
    source: Image {
      source: nav.iconSource
      fillMode: Image.PreserveAspectFit
      sourceSize.width: Style.font.iconLarge
      sourceSize.height: Style.font.iconLarge
    }
  }

  MouseArea {
    id: navMouse
    anchors.fill: parent
    hoverEnabled: true
    cursorShape: Qt.PointingHandCursor
    onClicked: nav.clicked()
  }

  Tooltip {
    visible: navMouse.containsMouse && nav.label !== ""
    text: nav.label
    fontFamily: nav.fontFamily
  }
}
