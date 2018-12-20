/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console:false, document, window */

import MultiRootEditor from '../../src/multirooteditor';
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

let editor, observer;

function initEditor() {
	MultiRootEditor
		.create( {
			title: '<h1>Page title</h1>',
			c1: '<p>Foo Bar Baz</p>',
			c2: '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>'
		}, {
			plugins: [ Essentials, Paragraph, Heading, Bold, Italic, Underline, Strikethrough, Alignment, List, Link, Table ],
			toolbar: [ 'heading', '|', 'bold', 'italic', 'underline', 'strikethrough', 'alignment', 'link',
				'bulletedList', 'numberedList', 'insertTable', 'undo', 'redo' ]
		} )
		.then( newEditor => {
			console.log( 'Editor was initialized', newEditor );
			console.log( 'You can now play with it using global `editor` and `editable` variables.' );

			document.querySelector( '.editable-container.title' ).innerHTML = '';
			document.querySelector( '.editable-container.c1' ).innerHTML = '';
			document.querySelector( '.editable-container.c2' ).innerHTML = '';

			document.querySelector( '.toolbar-container' ).appendChild( newEditor.ui.view.toolbar.element );
			document.querySelector( '.editable-container.title' ).appendChild( newEditor.ui.view.editables[ 0 ].element );
			document.querySelector( '.editable-container.c1' ).appendChild( newEditor.ui.view.editables[ 1 ].element );
			document.querySelector( '.editable-container.c2' ).appendChild( newEditor.ui.view.editables[ 2 ].element );

			window.editor = editor = newEditor;

			observer = testUtils.createObserver();
			observer.observe( 'Editable:title', editor.editing.view.document.getRoot( 'title' ), [ 'isFocused' ] );
			observer.observe( 'Editable:c1', editor.editing.view.document.getRoot( 'c1' ), [ 'isFocused' ] );
			observer.observe( 'Editable:c2', editor.editing.view.document.getRoot( 'c2' ), [ 'isFocused' ] );
		} )
		.catch( err => {
			console.error( err.stack );
		} );
}

function destroyEditor() {
	editor.destroy()
		.then( () => {
			window.editor = editor = null;

			observer.stopListening();
			observer = null;

			document.querySelector( '.toolbar-container' ).innerHTML = '';

			const title = document.querySelector( '.editable-container.title' );
			const element1 = document.querySelector( '.editable-container.c1' );
			const element2 = document.querySelector( '.editable-container.c2' );

			title.innerHTML = title.querySelector( 'div' ).innerHTML;
			element1.innerHTML = element1.querySelector( 'div' ).innerHTML;
			element2.innerHTML = element2.querySelector( 'div' ).innerHTML;

			console.log( 'Editor was destroyed' );
		} );
}

document.getElementById( 'initEditor' ).addEventListener( 'click', initEditor );
document.getElementById( 'destroyEditor' ).addEventListener( 'click', destroyEditor );
