import QtQuick
import qs.Commons

// Transient "Copied — ..." feedback shown in the verse and reader tabs;
// mirrors the panel's copyFeedback and auto-clears via copyFeedbackTimer.
Text {
  required property string copyFeedback
  required property string fontFamily

  property bool centered: false

  width: parent.width
  visible: copyFeedback !== ""
  text: copyFeedback
  textFormat: Text.PlainText
  color: Color.accent
  font.family: fontFamily
  font.pixelSize: Style.font.bodySmall
  wrapMode: Text.WordWrap
  horizontalAlignment: centered ? Text.AlignHCenter : Text.AlignLeft
  elide: centered ? Text.ElideRight : Text.ElideNone
}
