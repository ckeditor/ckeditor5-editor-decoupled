/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module editor-decoupled/decouplededitor
 */

import Editor from '@ckeditor/ckeditor5-core/src/editor/editor';
import HtmlDataProcessor from '@ckeditor/ckeditor5-engine/src/dataprocessor/htmldataprocessor';
import CKEditorError from '@ckeditor/ckeditor5-utils/src/ckeditorerror';
import DecoupledEditorUI from './decouplededitorui';
import DecoupledEditorUIView from './decouplededitoruiview';
import getDataFromElement from '@ckeditor/ckeditor5-utils/src/dom/getdatafromelement';
import setDataInElement from '@ckeditor/ckeditor5-utils/src/dom/setdatainelement';
import log from '@ckeditor/ckeditor5-utils/src/log';
import { isElement } from 'lodash-es';

/**
 * The {@glink builds/guides/overview#decoupled-editor decoupled editor} implementation.
 * It provides an inline editables and a toolbar. However, unlike other editors,
 * it does not render these components anywhere in the DOM unless configured.
 *
 * This type of an editor is dedicated to integrations which require a customized UI with an open
 * structure, allowing developers to specify the exact location of the interface.
 *
 * See the {@glink examples/builds/document-editor document editor demo} to learn about possible use cases for the decoupled editor.
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
 * @implements module:core/editor/editorwithui~EditorWithUI
 * @extends module:core/editor/editor~Editor
 */
export default class DecoupledEditor extends Editor {
	/**
	 * Creates an instance of the decoupled editor.
	 *
	 * **Note:** Do not use the constructor to create editor instances. Use the static
	 * {@link module:editor-decoupled/decouplededitor~DecoupledEditor.create `DecoupledEditor.create()`} method instead.
	 *
	 * @protected
	 * @param {Object.<String,String>|Object.<String,HTMLElement>} sourceElementsOrData The object where each key
	 * is the name of the root and corresponding value is the DOM element that will be the source for the created editor
	 * (on which the editor will be initialized) or initial data for the editor. For more information see
	 * {@link module:editor-decoupled/decouplededitor~DecoupledEditor.create `DecoupledEditor.create()`}.
	 * @param {module:core/editor/editorconfig~EditorConfig} config The editor configuration.
	 */
	constructor( sourceElementsOrData, config ) {
		super( config );

		/**
		 * The array of all sourceElements (which becomes editable areas) if any were passed in `sourceElementsOrData`.
		 *
		 * @protected
		 * @member {Array.<HTMLElement>}
		 */
		this._sourceElements = [];

		/**
		 * The array of all root names.
		 *
		 * @protected
		 * @member {Array.<String>}
		 */
		this._rootNames = sourceElementsOrData ? Object.keys( sourceElementsOrData ) : [];

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

		this.ui = new DecoupledEditorUI( this, new DecoupledEditorUIView( this.locale, editables ) );
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
	 * **Note**: The decoupled editor does not remove the toolbar and editables when destroyed. You can
	 * do that yourself in the destruction chain:
	 *
	 *		editor.destroy()
	 *			.then( () => {
	 *				// Remove the toolbar from DOM.
	 *				editor.ui.view.toolbar.element.remove();
	 *
	 *				// Remove editables from DOM.
	 *				editor.ui.view.editables.forEach( editable => editable.element.remove() );
	 *
	 *				console.log( 'Editor was destroyed' );
	 *			} );
	 *
	 * @returns {Promise}
	 */
	destroy() {
		// Cache the data, then destroy.
		// It's safe to assume that the model->view conversion will not work after super.destroy().
		const data = [];
		for ( const rootName of this._rootNames ) {
			data.push( this.getData( rootName ) );
		}

		this.ui.destroy();

		return super.destroy()
			.then( () => {
				if ( this._sourceElements.length ) {
					for ( let i = 0; i < this._rootNames.length; i++ ) {
						setDataInElement( this._sourceElements[ i ], data[ i ] );
					}
				}
			} );
	}

	/**
	 * Gets the data from the editor.
	 *
	 *		editor.getData(); // -> '<p>This is editor!</p>'
	 *		editor.getData( 'rootName' ); // -> '<h1>CKEditor 5</h1>'
	 *
	 * By default the editor outputs HTML. This can be controlled by injecting a different data processor.
	 * See the {@glink features/markdown Markdown output} guide for more details.
	 *
	 * Note: Not only is the format of the data configurable, but the type of the `getData()`'s return value does not
	 * have to be a string either. You can e.g. return an object or a DOM `DocumentFragment`  if you consider this
	 * the right format for you.
	 *
	 * @method #getData
	 * @param {String} [rootName='main'] The root name from which to get data.
	 * @returns {String} Output data.
	 */
	getData( rootName = 'main' ) {
		if ( !this._rootNames.includes( rootName ) ) {
			/**
			 * Thrown when there is an attempt to get data on a non-existing root.
			 *
			 * @error trying-to-get-data-on-non-existing-root
			 */
			throw new CKEditorError( 'trying-to-get-data-on-non-existing-root: ' +
				`Attempting to get data from non-existing "${ rootName }" root.`
			);
		}

		return this.data.get( rootName );
	}

	/**
	 * Sets the data in the editor editable areas.
	 *
	 * There are couple of ways `setData` can be used. When only data is passed it is set on the default root (`main`):
	 *
	 *		editor.setData( '<h1>CKEditor 5</h1>' ); // Sets data on the `main` root.
	 *
	 * Along with the data, object specifying root name can be passed:
	 *
	 *		editor.setData( '<p>This is editor!</p>', { rootName: 'content' } ); // Sets data on the `content` root.
	 *
	 * Finally, object specifying `rootName` - `data` pairs could be used:
	 *
	 *		editor.setData( { main: '<h1>CKEditor 5</h1>', content: '<p>This is editor!</p>' } ); // Sets data on `main` and `content` root.
	 *
	 * By default the editor accepts HTML. This can be controlled by injecting a different data processor.
	 * See the {@glink features/markdown Markdown output} guide for more details.
	 *
	 * Note: Not only is the format of the data configurable, but the type of the `setData()`'s data values does not
	 * have to be a string either. The data can be e.g. an object or a DOM `DocumentFragment` if you consider this
	 * the right format for you.
	 *
	 * @method #setData
	 * @param {String|Object.<String,String>} data Data as a sting or an object containing input data where each key
	 * is the name of the root and corresponding value is a data to set.
	 * @param {Object} [options] The options object specifying on which root to set data. Has effect only if first
	 * parameter is passed as a string.
	 */
	setData( data, options ) {
		let roots = {};

		if ( typeof data === 'string' ) {
			const rootName = options && options.rootName ? options.rootName : 'main';
			roots[ rootName ] = data;
		} else {
			roots = data;
		}

		for ( const [ rootName, content ] of Object.entries( roots ) ) {
			if ( !this._rootNames.includes( rootName ) ) {
				/**
				 * Thrown when there is an attempt to set data on a non-existing root.
				 *
				 * @error trying-to-set-data-on-non-existing-root
				 */
				log.warn( `trying-to-set-data-on-non-existing-root: Attempting to set data on non-existing "${ rootName }" root.` );
			} else {
				this.data.set( content, rootName );
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
	 * It is possible to create the editor out of a pure data string. The editor will then render
	 * an editable element that must be inserted into the DOM for the editor to work properly:
	 *
	 *		DecoupledEditor
	 *			.create( '<p>Editor data</p>' )
	 *			.then( editor => {
	 *				// Append the toolbar to the <body> element.
	 *				document.body.appendChild( editor.ui.view.toolbar.element );
	 *
	 *				// Append the editable to the <body> element.
	 *				document.body.appendChild( editor.ui.view.editables[ 0 ].element );
	 *
	 *				console.log( 'Editor was initialized', editor );
	 *			} )
	 *			.catch( err => {
	 *				console.error( err.stack );
	 *			} );
	 *
	 * Since decoupled editor supports multiple roots, it can be created by passing object containing `rootName` - `DOM
	 * element` pairs:
	 *
	 *		DecoupledEditor
	 *			.create( {
	 *				title: document.querySelector( '#editor-title' ),
	 *				content: document.querySelector( '#editor-content' )
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
	 * or a `rootName` - `initial data` pairs:
	 *
	 *		DecoupledEditor
	 *			.create( {
	 *				title: '<h1>Multiple root editor</h1>',
	 *				content: '<p>Second editor root.</p>'
	 *			} )
	 *			.then( editor => {
	 *				// Append the toolbar to the <body> element.
	 *				document.body.appendChild( editor.ui.view.toolbar.element );
	 *
	 *				// Append the editables to the <body> element.
	 *				editor.ui.view.editables.forEach( editable => document.body.appendChild( editable.element ) );
	 *
	 *				console.log( 'Editor was initialized', editor );
	 *			} )
	 *			.catch( err => {
	 *				console.error( err.stack );
	 *			} );
	 *
	 * @param {HTMLElement|String|Object.<String,String>|Object.<String,HTMLElement>} sourceElementOrData The DOM element
	 * that will be the source for the created editor (on which the editor will be initialized), initial data for the editor
	 * or an object containing `rootName` - `DOM element` or `rootName` - `initial data` pairs for creating multiple root editor.
	 *
	 * If a source elements are passed (directly or in the object parameter), then its contents will be automatically
	 * {@link module:editor-decoupled/decouplededitor~DecoupledEditor#setData loaded} to the editor on startup and the elements
	 * itself will be used as the editor's editable elements.
	 *
	 * If data is provided, then the `editor.ui.view.editables` array will be created automatically and each root
	 * (e.g. `editor.ui.view.editables[ 0 ].element`) needs to be added to the DOM manually.
	 * @param {module:core/editor/editorconfig~EditorConfig} config The editor configuration.
	 * @returns {Promise} A promise resolved once the editor is ready.
	 * The promise returns the created {@link module:editor-decoupled/decouplededitor~DecoupledEditor} instance.
	 */
	static create( sourceElementsOrData, config ) {
		const newSourceElementsOrData = handleSingleInput( sourceElementsOrData );

		return new Promise( resolve => {
			const editor = new this( newSourceElementsOrData, config );

			resolve(
				editor.initPlugins()
					.then( () => {
						editor.ui.init();
						editor.fire( 'uiReady' );
					} )
					.then( () => {
						const data = {};
						const names = Object.keys( newSourceElementsOrData );

						for ( const name of names ) {
							const sourceElementOrData = newSourceElementsOrData[ name ];
							const initialData = isElement( sourceElementOrData ) ?
								getDataFromElement( sourceElementOrData ) :
								sourceElementOrData;

							data[ name ] = initialData;
						}

						return editor.data.init( data );
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

function handleSingleInput( sourceElementOrData ) {
	if ( typeof sourceElementOrData === 'string' || isElement( sourceElementOrData ) ) {
		return { main: sourceElementOrData };
	}

	return sourceElementOrData;
}
