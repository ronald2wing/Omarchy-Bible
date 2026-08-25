import QtQuick
import qs.Commons

// Translation picker: every tab offers the same five translations.
InPanelDropdown {
  required property var translationOptions

  options: translationOptions

  // Explicit height (not just implicitHeight): Row/Column positioners cull
  // children whose width()/height() are 0, and a bare Item's implicit size
  // is not applied to its size. Without this the trigger never renders.
  height: Style.spacing.controlHeight

  function currentLabel() {
    for (var i = 0; i < options.length; i++) {
      if (optionValue(options[i]) === value) return optionLabel(options[i])
    }
    return value
  }

  listComponent: Component {
    Column {
      id: listColumn
      spacing: Style.spacing.xxs

      Repeater {
        model: options
        delegate: Rectangle {
          required property var modelData
          width: listColumn.width
          height: Style.spacing.popupRowHeight
          radius: Style.cornerRadius
          color: rowMouse.containsMouse
            ? Style.hoverFillFor(foreground, Color.accent)
            : "transparent"

          Text {
            anchors.left: parent.left
            anchors.leftMargin: Style.spacing.controlPaddingX
            anchors.verticalCenter: parent.verticalCenter
            text: optionLabel(modelData)
            textFormat: Text.PlainText
            color: optionValue(modelData) === value ? Color.accent : foreground
            font.family: fontFamily
            font.pixelSize: Style.font.bodySmall
          }

          MouseArea {
            id: rowMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: rowClicked(optionValue(modelData))
          }
        }
      }
    }
  }
}
