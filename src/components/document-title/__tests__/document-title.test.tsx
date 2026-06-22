import * as React from 'react';
import {render} from '@testing-library/react';
import {DocumentTitle} from '../document-title';
import {Helmet} from 'react-helmet';

describe('<DocumentTitle>', () => {
	it('sets a branded document title', () => {
		render(<DocumentTitle title="mock-title" />);
		expect(Helmet.peek().title).toBe('mock-title - Twine RS');
	});

	it('does not duplicate the app title', () => {
		render(<DocumentTitle title="Twine RS" />);
		expect(Helmet.peek().title).toBe('Twine RS');
	});
});
