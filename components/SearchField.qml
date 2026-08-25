import QtQuick
import qs.Commons
import qs.Ui

// Search input for the Bible tabs: a TextField with an inline
// clear button (visible once text is entered). Arrow-key navigation is gated
// by `hasResults`; the clear button emits `clear`.
TextField {
  id: field

  // Bound so a huge pasted query can't fan out into unbounded search/suggest work.
  maximumLength: 500

  required property QtObject panel
  required property color barForeground
  required property string closeGlyph
  required property real opacityPrimary
  required property real opacitySecondary
  required property real opacityTertiary
  required property string fontFamily
  required property Item keyCatcher

  property bool hasResults: false
  signal navigate(int delta)
  signal clear()

  foreground: panel.foreground
  accent: Color.accent
  rightPadding: Style.spacing.controlHeight + Style.spacing.sm * 2

  Keys.priority: Keys.BeforeItem
  Keys.onPressed: function(event) {
    if (!field.hasResults) return
    if (event.key === Qt.Key_Down) {
      field.navigate(1)
      event.accepted = true
    } else if (event.key === Qt.Key_Up) {
      field.navigate(-1)
      event.accepted = true
    }
  }

  // Dismiss the search: clear suggestions, drop focus, return it to the panel.
  function dismiss() {
    panel.suggestions = []
    field.focus = false
    keyCatcher.forceActiveFocus()
  }

  onAccepted: field.dismiss()
  Keys.onEscapePressed: field.dismiss()

  Rectangle {
    anchors.right: parent.right
    anchors.rightMargin: Style.spacing.sm
    anchors.verticalCenter: parent.verticalCenter
    width: Style.spacing.controlHeight
    height: Style.spacing.controlHeight
    radius: Style.cornerRadius
    visible: field.text !== ""
    color: clearMouse.containsMouse
      ? Style.hoverFillFor(field.barForeground, Color.accent)
      : "transparent"

    Text {
      anchors.centerIn: parent
      text: field.closeGlyph
      textFormat: Text.PlainText
      color: panel.foreground
      opacity: field.opacitySecondary
      font.family: field.fontFamily
      font.pixelSize: Style.font.body
    }

    MouseArea {
      id: clearMouse
      anchors.fill: parent
      hoverEnabled: true
      cursorShape: Qt.PointingHandCursor
      onClicked: {
        field.clear()
        field.forceActiveFocus()
      }
    }
  }
}
