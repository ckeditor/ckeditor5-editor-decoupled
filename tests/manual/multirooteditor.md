1. Click "Init editor".
1. Expected:
  * The containers should fill up with the respective editor UI.
  * There should be a toolbar.
3. Play with editor editables to see if all features works as expected.
1. Click "Destroy editor".
1. Expected:
  * Editor should be destroyed.
  * All data in editable areas should be preserved.
  * The `.ck-body` region should be removed.

## Notes:

* You can play with:
  * `editor.isReadOnly`,
* Changes to `editable.isFocused` should be logged to the console.
* Features should work.
