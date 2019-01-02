/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document */

import DecoupledEditorUIView from '../src/decouplededitoruiview';
import ToolbarView from '@ckeditor/ckeditor5-ui/src/toolbar/toolbarview';
import InlineEditableUIView from '@ckeditor/ckeditor5-ui/src/editableui/inline/inlineeditableuiview';
import Locale from '@ckeditor/ckeditor5-utils/src/locale';

describe( 'DecoupledEditorUIView', () => {
	let locale, view;

	beforeEach( () => {
		locale = new Locale( 'en' );
		view = new DecoupledEditorUIView( locale, [ { name: 'main' } ] );
	} );

	describe( 'constructor()', () => {
		it( 'is virtual', () => {
			expect( view.template ).to.be.undefined;
			expect( view.element ).to.be.null;
		} );

		describe( '#toolbar', () => {
			it( 'is created', () => {
				expect( view.toolbar ).to.be.instanceof( ToolbarView );
			} );

			it( 'is given a locale object', () => {
				expect( view.toolbar.locale ).to.equal( locale );
			} );

			it( 'is not rendered', () => {
				expect( view.toolbar.isRendered ).to.be.false;
			} );
		} );

		describe( '#editable', () => {
			it( 'is created', () => {
				expect( view.editables[ 0 ] ).to.be.instanceof( InlineEditableUIView );
			} );

			it( 'is given a locale object', () => {
				expect( view.editables[ 0 ].locale ).to.equal( locale );
			} );

			it( 'is not rendered', () => {
				expect( view.editables[ 0 ].isRendered ).to.be.false;
			} );

			it( 'can be created out of an existing DOM element', () => {
				const editableElement = document.createElement( 'div' );
				const testView = new DecoupledEditorUIView( locale, [ { name: 'main', sourceElement: editableElement } ] );

				testView.render();

				expect( testView.editables[ 0 ].element ).to.equal( editableElement );

				testView.destroy();
			} );
		} );
	} );

	describe( 'render()', () => {
		beforeEach( () => {
			view.render();
		} );

		afterEach( () => {
			view.destroy();
		} );

		describe( '#toolbar', () => {
			it( 'is rendered but gets no parent', () => {
				expect( view.isRendered ).to.be.true;
				expect( view.toolbar.element.parentElement ).to.be.null;
			} );

			it( 'gets the CSS classes', () => {
				expect( view.toolbar.element.classList.contains( 'ck-reset_all' ) ).to.be.true;
				expect( view.toolbar.element.classList.contains( 'ck-rounded-corners' ) ).to.be.true;
			} );
		} );

		describe( '#editable', () => {
			it( 'is rendered but gets no parent', () => {
				expect( view.isRendered ).to.be.true;
				expect( view.editables[ 0 ].element.parentElement ).to.be.null;
			} );
		} );
	} );

	describe( 'destroy', () => {
		beforeEach( () => {
			view.render();
		} );

		it( 'destroys #toolbar and #editable', () => {
			const toolbarSpy = sinon.spy( view.toolbar, 'destroy' );
			const editableSpy = sinon.spy( view.editables[ 0 ], 'destroy' );

			view.destroy();

			sinon.assert.calledOnce( toolbarSpy );
			sinon.assert.calledOnce( editableSpy );
		} );

		it( 'does not touch the toolbar#element and editable#element by default', () => {
			document.body.appendChild( view.toolbar.element );
			document.body.appendChild( view.editables[ 0 ].element );

			expect( view.toolbar.element.parentElement ).to.equal( document.body );
			expect( view.editables[ 0 ].element.parentElement ).to.equal( document.body );

			view.destroy();

			expect( view.toolbar.element.parentElement ).to.equal( document.body );
			expect( view.editables[ 0 ].element.parentElement ).to.equal( document.body );

			view.toolbar.element.remove();
			view.editables[ 0 ].element.remove();
		} );
	} );

	describe( 'editableElement', () => {
		it( 'returns editable\'s view element', () => {
			view.render();
			expect( view.editables[ 0 ].editableElement.getAttribute( 'contentEditable' ) ).to.equal( 'true' );
			view.destroy();
		} );
	} );
} );
