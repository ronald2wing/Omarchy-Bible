import QtQuick
import qs.Commons

// In-panel dropdown used by the translation picker. Reimplemented as a
// lightweight Rectangle + Text + MouseArea because a QQC.Popup always
// constructs its own top-level overlay window, even while closed. Inside the
// layer-shell panel that overlay conflicts with the surface on first show and
// hangs the panel open.
Item {
  id: dd

  required property color foreground
  required property string fontFamily
  required property real opacitySecondary
  // Content root the dropdown list reparents into (the panel's keyCatcher),
  // and the scrollable it closes on (the panel's bodyScroll).
  required property Item keyCatcher
  required property Flickable bodyScroll
  // The hosting panel: the list closes on tab/expand/close changes.
  required property QtObject panel

  property var value: null
  property var options: []
  // Component instantiated inside dropdownList to render the option rows. Rows
  // call optionValue()/optionLabel() and, on click, rowClicked().
  property Component listComponent: null

  signal changed(var value)

  // True while the option list is open; the panel's keyCatcher reads this to
  // suspend its own key handling while the dropdown has focus.
  readonly property bool popupOpen: dropdownList.visible

  function optionValue(o) { return (o && typeof o === "object") ? o.value : o }
  function optionLabel(o) { return (o && typeof o === "object") ? String(o.label) : String(o) }
  // Label rendered on the trigger; TranslationDropdown overrides this to
  // look the translation code up in its options list.
  function currentLabel() { return (value === null || value === undefined) ? "" : String(value) }
  // Row click behavior: write the value back, emit changed, and close the list.
  function rowClicked(v) { value = v; changed(v); close() }
  // Popup height: the full option list, one row per entry plus spacing.
  function popupHeight() {
    var rows = Math.max(0, options.length)
    return rows * Style.spacing.popupRowHeight
      + Math.max(0, rows - 1) * Style.spacing.xxs
      + Style.spacing.xxs * 2
  }
  function open() {
    // Position the list under the trigger in keyCatcher's coordinate space,
    // then show it. Done at open time (not via a binding) because the layout
    // is stable when the user clicks the trigger; a mapToItem binding would
    // capture a stale pre-layout position.
    var p = trigger.mapToItem(keyCatcher, 0, trigger.height)
    dropdownList.x = p.x
    dropdownList.y = p.y + Style.spacing.xxs
    dropdownList.visible = true
  }
  function close() { dropdownList.visible = false }
  function toggle() { dropdownList.visible ? close() : open() }

  // Compact trigger sized to the current label plus chevron and padding.
  implicitWidth: Math.max(Style.space(120),
    labelText.implicitWidth + chevronText.implicitWidth
      + Style.spacing.controlPaddingX * 2 + Style.spacing.controlGap)
  implicitHeight: Style.spacing.controlHeight

  Rectangle {
    id: trigger
    z: 1
    anchors.fill: parent
    radius: Style.cornerRadius
    color: triggerMouse.containsMouse || dd.popupOpen
      ? Style.hoverFillFor(dd.foreground, Color.accent)
      : "transparent"
    border.width: 1
    border.color: Color.popups.border

    Text {
      id: labelText
      anchors.left: parent.left
      anchors.leftMargin: Style.spacing.controlPaddingX
      anchors.right: chevronText.left
      anchors.rightMargin: Style.spacing.controlGap
      anchors.verticalCenter: parent.verticalCenter
      text: dd.currentLabel()
      textFormat: Text.PlainText
      color: dd.foreground
      font.family: dd.fontFamily
      font.pixelSize: Style.font.bodySmall
      elide: Text.ElideRight
    }

    Text {
      id: chevronText
      anchors.right: parent.right
      anchors.rightMargin: Style.spacing.controlPaddingX
      anchors.verticalCenter: parent.verticalCenter
      text: dd.popupOpen ? "▲" : "▼"
      textFormat: Text.PlainText
      color: dd.foreground
      opacity: dd.opacitySecondary
      font.family: dd.fontFamily
      font.pixelSize: Style.font.caption
    }

    MouseArea {
      id: triggerMouse
      anchors.fill: parent
      hoverEnabled: true
      cursorShape: Qt.PointingHandCursor
      onClicked: dd.toggle()
    }
  }

  Rectangle {
    id: dropdownList
    // Rendered as an overlay on keyCatcher (the panel content root) rather
    // than inside the trigger. The header Row lives inside bodyScroll's
    // clipped Flickable, so a dropdown anchored to the trigger there loses hit
    // tests to the z:0 content siblings below the header. Reparenting here
    // escapes that clip/z ordering; z keeps the list above all content.
    parent: keyCatcher
    z: 100
    visible: false
    x: 0
    y: 0
    width: Math.max(dd.width, Style.space(140))
    height: dd.popupHeight()
    radius: Style.cornerRadius
    color: Color.popups.background
    border.width: 1
    border.color: Color.popups.border

    Loader {
      anchors.fill: parent
      anchors.margins: Style.spacing.xxs
      sourceComponent: dd.listComponent
    }
  }

  // The header is shared across tabs, so a stale open list must not survive
  // a tab switch, a panel close, an expand toggle, or a content scroll.
  // The last two reposition the trigger under an already-open list.
  Connections {
    target: panel
    function onCurrentTabChanged() { dd.close() }
    function onOpenedChanged() { if (!panel.opened) dd.close() }
    function onExpandedChanged() { dd.close() }
  }

  Connections {
    target: bodyScroll
    function onContentYChanged() { if (dd.popupOpen) dd.close() }
  }
}
