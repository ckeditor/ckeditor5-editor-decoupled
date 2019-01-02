/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document, setTimeout */

import DecoupledEditorUI from '../src/decouplededitorui';
import DecoupledEditorUIView from '../src/decouplededitoruiview';

import HtmlDataProcessor from '@ckeditor/ckeditor5-engine/src/dataprocessor/htmldataprocessor';

import DecoupledEditor from '../src/decouplededitor';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import DataApiMixin from '@ckeditor/ckeditor5-core/src/editor/utils/dataapimixin';
import RootElement from '@ckeditor/ckeditor5-engine/src/model/rootelement';
import CKEditorError from '@ckeditor/ckeditor5-utils/src/ckeditorerror';

import log from '@ckeditor/ckeditor5-utils/src/log';

import testUtils from '@ckeditor/ckeditor5-core/tests/_utils/utils';

const editorData = '<p><strong>foo</strong> bar</p>';

describe( 'DecoupledEditor', () => {
	let editor;

	testUtils.createSinonSandbox();

	describe( 'constructor()', () => {
		beforeEach( () => {
			editor = new DecoupledEditor( { main: '' } );
		} );

		it( 'uses HTMLDataProcessor', () => {
			expect( editor.data.processor ).to.be.instanceof( HtmlDataProcessor );
		} );

		it( 'does not have a Data Interface', () => {
			expect( testUtils.isMixed( DecoupledEditor, DataApiMixin ) ).to.be.false;
		} );

		it( 'provides getData method', () => {
			expect( editor.getData ).to.be.instanceof( Function );
		} );

		it( 'provides setData method', () => {
			expect( editor.setData ).to.be.instanceof( Function );
		} );

		it( 'implements the EditorWithUI interface', () => {
			expect( editor.element ).to.be.null;
		} );

		it( 'does not create main root element with empty constructor', () => {
			const editor = new DecoupledEditor();
			expect( editor.model.document.getRoot( 'main' ) ).to.be.null;
		} );

		it( 'creates main root element', () => {
			expect( editor.model.document.getRoot( 'main' ) ).to.instanceof( RootElement );
		} );

		describe( 'ui', () => {
			it( 'is created', () => {
				editor.ui.init();

				expect( editor.ui ).to.be.instanceof( DecoupledEditorUI );
				expect( editor.ui.view ).to.be.instanceof( DecoupledEditorUIView );

				editor.ui.destroy();
			} );
		} );
	} );

	describe( 'create()', () => {
		it( 'should properly handled async data initialization', done => {
			const spy = sinon.spy();
			let resolver;

			class AsyncDataInit extends Plugin {
				init() {
					this.editor.on( 'dataReady', () => spy( 'dataReady' ) );

					this.editor.data.on( 'init', evt => {
						evt.stop();
						evt.return = new Promise( resolve => {
							resolver = () => {
								spy( 'asyncInit' );
								resolve();
							};
						} );
					}, { priority: 'high' } );
				}
			}

			DecoupledEditor.create( '<p>foo bar</p>', {
				plugins: [ Paragraph, Bold, AsyncDataInit ]
			} ).then( editor => {
				sinon.assert.calledWith( spy.firstCall, 'asyncInit' );
				sinon.assert.calledWith( spy.secondCall, 'dataReady' );

				editor.destroy().then( done );
			} );

			// Resolve init promise in next cycle to hold data initialization.
			setTimeout( () => resolver() );
		} );

		describe( 'editor with data', () => {
			test( () => editorData );
		} );

		describe( 'editor with editable element', () => {
			let editableElement;

			beforeEach( () => {
				editableElement = document.createElement( 'div' );
				editableElement.innerHTML = editorData;
			} );

			test( () => editableElement );
		} );

		function test( getElementOrData ) {
			it( 'creates an instance which inherits from the DecoupledEditor', () => {
				return DecoupledEditor
					.create( getElementOrData(), {
						plugins: [ Paragraph, Bold ]
					} )
					.then( newEditor => {
						expect( newEditor ).to.be.instanceof( DecoupledEditor );

						return newEditor.destroy();
					} );
			} );

			it( 'loads the initial data', () => {
				return DecoupledEditor
					.create( getElementOrData(), {
						plugins: [ Paragraph, Bold ]
					} )
					.then( newEditor => {
						expect( newEditor.getData() ).to.equal( '<p><strong>foo</strong> bar</p>' );

						return newEditor.destroy();
					} );
			} );

			// https://github.com/ckeditor/ckeditor5-editor-classic/issues/53
			it( 'creates an instance of a DecoupledEditor child class', () => {
				class CustomDecoupledEditor extends DecoupledEditor {}

				return CustomDecoupledEditor
					.create( getElementOrData(), {
						plugins: [ Paragraph, Bold ]
					} )
					.then( newEditor => {
						expect( newEditor ).to.be.instanceof( CustomDecoupledEditor );
						expect( newEditor ).to.be.instanceof( DecoupledEditor );

						expect( newEditor.getData() ).to.equal( '<p><strong>foo</strong> bar</p>' );

						return newEditor.destroy();
					} );
			} );

			// https://github.com/ckeditor/ckeditor5-editor-decoupled/issues/3
			it( 'initializes the data controller', () => {
				let dataInitSpy;

				class DataInitAssertPlugin extends Plugin {
					constructor( editor ) {
						super();

						this.editor = editor;
					}

					init() {
						dataInitSpy = sinon.spy( this.editor.data, 'init' );
					}
				}

				return DecoupledEditor
					.create( getElementOrData(), {
						plugins: [ Paragraph, Bold, DataInitAssertPlugin ]
					} )
					.then( newEditor => {
						sinon.assert.calledOnce( dataInitSpy );

						return newEditor.destroy();
					} );
			} );

			describe( 'events', () => {
				it( 'fires all events in the right order', () => {
					const fired = [];

					function spy( evt ) {
						fired.push( evt.name );
					}

					class EventWatcher extends Plugin {
						init() {
							this.editor.on( 'pluginsReady', spy );
							this.editor.on( 'uiReady', spy );
							this.editor.on( 'dataReady', spy );
							this.editor.on( 'ready', spy );
						}
					}

					return DecoupledEditor
						.create( getElementOrData(), {
							plugins: [ EventWatcher ]
						} )
						.then( newEditor => {
							expect( fired ).to.deep.equal( [ 'pluginsReady', 'uiReady', 'dataReady', 'ready' ] );

							return newEditor.destroy();
						} );
				} );

				it( 'fires dataReady once data is loaded', () => {
					let data;

					class EventWatcher extends Plugin {
						init() {
							this.editor.on( 'dataReady', () => {
								data = this.editor.getData();
							} );
						}
					}

					return DecoupledEditor
						.create( getElementOrData(), {
							plugins: [ EventWatcher, Paragraph, Bold ]
						} )
						.then( newEditor => {
							expect( data ).to.equal( '<p><strong>foo</strong> bar</p>' );

							return newEditor.destroy();
						} );
				} );

				it( 'fires uiReady once UI is rendered', () => {
					let isReady;

					class EventWatcher extends Plugin {
						init() {
							this.editor.on( 'uiReady', () => {
								isReady = this.editor.ui.view.isRendered;
							} );
						}
					}

					return DecoupledEditor
						.create( getElementOrData(), {
							plugins: [ EventWatcher ]
						} )
						.then( newEditor => {
							expect( isReady ).to.be.true;

							return newEditor.destroy();
						} );
				} );
			} );
		}
	} );

	describe( 'destroy()', () => {
		describe( 'editor with data', () => {
			beforeEach( function() {
				return DecoupledEditor
					.create( editorData, { plugins: [ Paragraph ] } )
					.then( newEditor => {
						editor = newEditor;
					} );
			} );

			test( () => editorData );
		} );

		describe( 'editor with editable element', () => {
			let editableElement;

			beforeEach( function() {
				editableElement = document.createElement( 'div' );
				editableElement.innerHTML = editorData;

				return DecoupledEditor
					.create( editableElement, { plugins: [ Paragraph ] } )
					.then( newEditor => {
						editor = newEditor;
					} );
			} );

			it( 'sets data back to the element', () => {
				editor.setData( '<p>foo</p>' );

				return editor.destroy()
					.then( () => {
						expect( editableElement.innerHTML ).to.equal( '<p>foo</p>' );
					} );
			} );

			test( () => editableElement );
		} );

		function test() {
			it( 'destroys the UI', () => {
				const spy = sinon.spy( editor.ui, 'destroy' );

				return editor.destroy()
					.then( () => {
						sinon.assert.calledOnce( spy );
					} );
			} );
		}
	} );

	describe( 'getData()', () => {
		beforeEach( function() {
			return DecoupledEditor
				.create( { main: 'Foo', main2: 'Bar' }, { plugins: [ Paragraph ] } )
				.then( newEditor => {
					editor = newEditor;
				} );
		} );

		it( 'should get data by default root name', () => {
			expect( editor.getData() ).to.equal( '<p>Foo</p>' );
		} );

		it( 'should get data by specified root name', () => {
			expect( editor.getData( 'main2' ) ).to.equal( '<p>Bar</p>' );
		} );

		it( 'should throw error when trying to get data from non existing root', () => {
			expect( () => {
				editor.getData( 'main3' );
			} ).to.throw( CKEditorError, /trying-to-get-data-on-non-existing-root/ );
		} );
	} );

	describe( 'setData()', () => {
		beforeEach( function() {
			return DecoupledEditor
				.create( { main: '', main2: '' }, { plugins: [ Paragraph ] } )
				.then( newEditor => {
					editor = newEditor;
				} );
		} );

		afterEach( () => {
			testUtils.sinon.restore();
		} );

		it( 'should set data by default root name', () => {
			editor.setData( 'Bar' );
			expect( editor.getData() ).to.equal( '<p>Bar</p>' );
		} );

		it( 'should set data by specified root name', () => {
			editor.setData( 'Foo', { rootName: 'main2' } );
			expect( editor.getData( 'main2' ) ).to.equal( '<p>Foo</p>' );
		} );

		it( 'should set data by providing rootName - data object', () => {
			editor.setData( { main: '12', main2: '34' } );
			expect( editor.getData( 'main' ) ).to.equal( '<p>12</p>' );
			expect( editor.getData( 'main2' ) ).to.equal( '<p>34</p>' );
		} );

		it( 'should log warning when trying to set data on non existing root #1', () => {
			const warnSpy = testUtils.sinon.stub( log, 'warn' ).callsFake( () => {} );

			editor.setData( 'Baz', { rootName: 'main3' } );

			expect( warnSpy.calledOnce ).to.true;
			expect( warnSpy.calledWithMatch( /trying-to-set-data-on-non-existing-root/ ) ).to.true;
		} );

		it( 'should log warning when trying to set data on non existing root #2', () => {
			const warnSpy = testUtils.sinon.stub( log, 'warn' ).callsFake( () => {} );

			editor.setData( { main: 'Baz1', main3: 'Baz2' } );

			expect( editor.getData( 'main' ) ).to.equal( '<p>Baz1</p>' );

			expect( warnSpy.calledOnce ).to.true;
			expect( warnSpy.calledWithMatch( /trying-to-set-data-on-non-existing-root/ ) ).to.true;
		} );
	} );
} );
