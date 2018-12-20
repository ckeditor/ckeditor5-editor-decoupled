/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module editor-decoupled/multirooteditor
 */

import Editor from '@ckeditor/ckeditor5-core/src/editor/editor';
import DataApiMixin from '@ckeditor/ckeditor5-core/src/editor/utils/dataapimixin';
import HtmlDataProcessor from '@ckeditor/ckeditor5-engine/src/dataprocessor/htmldataprocessor';
import MultiRootEditorUI from './multirooteditorui';
import MultiRootEditorUIView from './multirooteditoruiview';
import getDataFromElement from '@ckeditor/ckeditor5-utils/src/dom/getdatafromelement';
import setDataInElement from '@ckeditor/ckeditor5-utils/src/dom/setdatainelement';
import mix from '@ckeditor/ckeditor5-utils/src/mix';
import log from '@ckeditor/ckeditor5-utils/src/log';
import { isElement } from 'lodash-es';

/**
 * The {@glink builds/guides/overview#decoupled-editor decoupled editor} implementation.
 * It provides an inline editable and a toolbar. However, unlike other editors,
 * it does not render these components anywhere in the DOM unless configured.
 *
 * This type of an editor is dedicated to integrations which require a customized UI with an open
 * structure, allowing developers to specify the exact location of the interface.
 *
 * See the document editor {@glink examples/builds/document-editor demo} to learn about possible use cases
 * for the decoupled editor.
 *
 * In order to create a decoupled editor instance, use the static
 * {@link module:editor-decoupled/decouplededitor~DecoupledEditor.create `DecoupledEditor.create()`} method.
 *
 * # Decoupled editor and document editor build
 *
 * The decoupled editor can be used directly from source (if you installed the
 * [`@ckeditor/ckeditor5-editor-decoupled`](https://www.npmjs.com/package/@ckeditor/ckeditor5-editor-decoupled) package)
 * but it is also available in the {@glink builds/guides/overview#document-editor document editor build}.
 *
 * {@glink builds/guides/overview Builds} are ready-to-use editors with plugins bundled in. When using the editor from
 * source you need to take care of loading all plugins by yourself
 * (through the {@link module:core/editor/editorconfig~EditorConfig#plugins `config.plugins`} option).
 * Using the editor from source gives much better flexibility and allows for easier customization.
 *
 * Read more about initializing the editor from source or as a build in
 * {@link module:editor-decoupled/decouplededitor~DecoupledEditor.create `DecoupledEditor.create()`}.
 *
 * @mixes module:core/editor/utils/dataapimixin~DataApiMixin
 * @implements module:core/editor/editorwithui~EditorWithUI
 * @extends module:core/editor/editor~Editor
 */
export default class MultiRootEditor extends Editor {
	/**
	 * Creates an instance of the decoupled editor.
	 *
	 * **Note:** Do not use the constructor to create editor instances. Use the static
	 * {@link module:editor-decoupled/decouplededitor~DecoupledEditor.create `DecoupledEditor.create()`} method instead.
	 *
	 * @protected
	 * @param {HTMLElement|String} sourceElementOrData The DOM element that will be the source for the created editor
	 * (on which the editor will be initialized) or initial data for the editor. For more information see
	 * {@link module:editor-balloon/ballooneditor~BalloonEditor.create `BalloonEditor.create()`}.
	 * @param {module:core/editor/editorconfig~EditorConfig} config The editor configuration.
	 */
	constructor( sourceElementsOrData, config ) {
		super( config );

		this._sourceElements = [];
		this._rootNames = Object.keys( sourceElementsOrData );

		this.data.processor = new HtmlDataProcessor();

		const editables = [];

		for ( const name of this._rootNames ) {
			const sourceElementOrData = sourceElementsOrData[ name ];

			this.model.document.createRoot( '$root', name );

			let sourceElement = null;

			if ( isElement( sourceElementOrData ) ) {
				sourceElement = sourceElementOrData;
				this._sourceElements.push( sourceElement );
			}

			editables.push( { name, sourceElement } );
		}

		this.ui = new MultiRootEditorUI( this, new MultiRootEditorUIView( this.locale, editables ) );
	}

	/**
	 * @inheritDoc
	 */
	get element() {
		// This editor has no single "main UI element". Its editable and toolbar are exposed separately and need
		// to be added to the DOM manually by the consumer.
		return null;
	}

	/**
	 * Destroys the editor instance, releasing all resources used by it.
	 *
	 * **Note**: The decoupled editor does not remove the toolbar and editable when destroyed. You can
	 * do that yourself in the destruction chain:
	 *
	 *		editor.destroy()
	 *			.then( () => {
	 *				// Remove the toolbar from DOM.
	 *				editor.ui.view.toolbar.element.remove();
	 *
	 *				// Remove the editable from DOM.
	 *				editor.ui.view.editable.element.remove();
	 *
	 *				console.log( 'Editor was destroyed' );
	 *			} );
	 *
	 * @returns {Promise}
	 */
	destroy() {
		// Cache the data, then destroy.
		// It's safe to assume that the model->view conversion will not work after super.destroy().
		const data = this.getData();

		this.ui.destroy();

		return super.destroy()
			.then( () => {
				if ( this._sourceElements.length ) {
					for ( let i = 0; i < this._rootNames.length; i++ ) {
						setDataInElement( this._sourceElements[ i ], data[ this._rootNames[ i ] ] );
					}
				}
			} );
	}

	// TODO docs
	getData() {
		const data = {};

		for ( const rootName of this._rootNames ) {
			data[ rootName ] = this.data.get( rootName );
		}

		return data;
	}

	// TODO docs
	setData( data ) {
		const roots = Object.keys( data );

		for ( const root of roots ) {
			if ( !this._rootNames.includes( root ) ) {
				// TODO docs
				log.warn( `setting-data-on-non-existing-root: Trying to set data on non existing "${ root }" root.` );
			} else {
				this.data.set( data[ root ], root );
			}
		}
	}

	/**
	 * Creates a decoupled editor instance.
	 *
	 * Creating an instance when using a {@glink builds/index CKEditor 5 build}:
	 *
	 *		DecoupledEditor
	 *			.create( document.querySelector( '#editor' ) )
	 *			.then( editor => {
	 *				// Append the toolbar to the <body> element.
	 *				document.body.appendChild( editor.ui.view.toolbar.element );
	 *
	 *				console.log( 'Editor was initialized', editor );
	 *			} )
	 *			.catch( err => {
	 *				console.error( err.stack );
	 *			} );
	 *
	 * Creating an instance when using CKEditor from source (make sure to specify the list of plugins to load and the toolbar):
	 *
	 *		import DecoupledEditor from '@ckeditor/ckeditor5-editor-decoupled/src/decouplededitor';
	 *		import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';
	 *		import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
	 *		import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
	 *		import ...
	 *
	 *		DecoupledEditor
	 *			.create( document.querySelector( '#editor' ), {
	 *				plugins: [ Essentials, Bold, Italic, ... ],
	 *				toolbar: [ 'bold', 'italic', ... ]
	 *			} )
	 *			.then( editor => {
	 *				// Append the toolbar to the <body> element.
	 *				document.body.appendChild( editor.ui.view.toolbar.element );
	 *
	 *				console.log( 'Editor was initialized', editor );
	 *			} )
	 *			.catch( err => {
	 *				console.error( err.stack );
	 *			} );
	 *
	 * **Note**: It is possible to create the editor out of a pure data string. The editor will then render
	 * an editable element that must be inserted into the DOM for the editor to work properly:
	 *
	 *		DecoupledEditor
	 *			.create( '<p>Editor data</p>' )
	 *			.then( editor => {
	 *				// Append the toolbar to the <body> element.
	 *				document.body.appendChild( editor.ui.view.toolbar.element );
	 *
	 *				// Append the editable to the <body> element.
	 *				document.body.appendChild( editor.ui.view.editable.element );
	 *
	 *				console.log( 'Editor was initialized', editor );
	 *			} )
	 *			.catch( err => {
	 *				console.error( err.stack );
	 *			} );
	 *
	 * @param {HTMLElement|String} sourceElementOrData The DOM element that will be the source for the created editor
	 * (on which the editor will be initialized) or initial data for the editor.
	 *
	 * If a source element is passed, then its contents will be automatically
	 * {@link module:editor-decoupled/decouplededitor~DecoupledEditor#setData loaded} to the editor on startup and the element
	 * itself will be used as the editor's editable element.
	 *
	 * If data is provided, then `editor.ui.view.editable.element` will be created automatically and needs to be added
	 * to the DOM manually.
	 * @param {module:core/editor/editorconfig~EditorConfig} config The editor configuration.
	 * @returns {Promise} A promise resolved once the editor is ready.
	 * The promise returns the created {@link module:editor-decoupled/decouplededitor~DecoupledEditor} instance.
	 */
	static create( sourceElementsOrData, config ) {
		return new Promise( resolve => {
			const editor = new this( sourceElementsOrData, config );

			resolve(
				editor.initPlugins()
					.then( () => {
						editor.ui.init();
						editor.fire( 'uiReady' );
					} )
					.then( () => {
						const initElementsData = [];
						const names = Object.keys( sourceElementsOrData );

						for ( const name of names ) {
							const sourceElementOrData = sourceElementsOrData[ name ];
							const initialData = isElement( sourceElementOrData ) ?
								getDataFromElement( sourceElementOrData ) :
								sourceElementOrData;

							// Do not use `editor.data.set( initialData, rootName )` in a loop, because first `#set` call
							// will empty all others root so data cannot be retrieved from them.
							initElementsData.push( { initialData, name } );
						}

						// Initiating data on one root changes document version and then when setting on another
						// error is thrown, see engine/controller/datacontroller#init. Instead engine/controller/datacontroller#set
						// can be used however I'm not sure how it plays with undo (it uses `transparent` batch so no undo
						// step should be created).
						return Promise.all( initElementsData.map( item => editor.data.set( item.initialData, item.name ) ) );
					} )
					.then( () => {
						editor.fire( 'dataReady' );
						editor.fire( 'ready' );
					} )
					.then( () => editor )
			);
		} );
	}
}

mix( MultiRootEditor, DataApiMixin );
