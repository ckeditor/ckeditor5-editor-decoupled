/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console:false, document, window */

import DecoupledEditorMultiple from '../../src/decouplededitormultiple';
import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';
import Heading from '@ckeditor/ckeditor5-heading/src/heading';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
import Underline from '@ckeditor/ckeditor5-basic-styles/src/underline';
import Strikethrough from '@ckeditor/ckeditor5-basic-styles/src/strikethrough';
import Alignment from '@ckeditor/ckeditor5-alignment/src/alignment';
import List from '@ckeditor/ckeditor5-list/src/list';
import Link from '@ckeditor/ckeditor5-link/src/link';
import Table from '@ckeditor/ckeditor5-table/src/table';
import testUtils from '@ckeditor/ckeditor5-utils/tests/_utils/utils';

let editor, editable, observer;

function initEditor() {
	DecoupledEditorMultiple
		.create( {
			main: document.querySelector( '.editable-container.c1 > div' ),
			main2: document.querySelector( '.editable-container.c2 > div' )
		}, {
			plugins: [ Essentials, Paragraph, Heading, Bold, Italic, Underline, Strikethrough, Alignment, List, Link, Table ],
			toolbar: [ 'heading', '|', 'bold', 'italic', 'underline', 'strikethrough', 'alignment', 'link',
				'bulletedList', 'numberedList', 'insertTable', 'undo', 'redo' ]
		} )
		.then( newEditor => {
			console.log( 'Editor was initialized', newEditor );
			console.log( 'You can now play with it using global `editor` and `editable` variables.' );

			document.querySelector( '.toolbar-container' ).appendChild( newEditor.ui.view.toolbar.element );

			window.editor = editor = newEditor;
			window.editable = editable = editor.editing.view.document.getRoot();

			observer = testUtils.createObserver();
			observer.observe( 'Editable', editable, [ 'isFocused' ] );
		} )
		.catch( err => {
			console.error( err.stack );
		} );
}

function destroyEditor() {
	editor.destroy()
		.then( () => {
			window.editor = editor = null;
			window.editable = editable = null;

			observer.stopListening();
			observer = null;

			document.querySelector( '.toolbar-container' ).innerHTML = '';

			console.log( 'Editor was destroyed' );
		} );
}

document.getElementById( 'initEditor' ).addEventListener( 'click', initEditor );
document.getElementById( 'destroyEditor' ).addEventListener( 'click', destroyEditor );
