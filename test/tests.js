'use strict';

const assert = require('assert');
const moment = require('moment');
const block = require('../');


describe('block', () => {
	const task = {};

	const context = {
		saveTask: () => {},
		debug: () => {},
		// debug: console.log,
	};

	it('should flush when saturated', () => {
		const step = {
			data: {
				collected: []
			}
		};

		let callbackCounter = 0;
		const done = (err, output) => {
			// console.log(output);
			callbackCounter++;
		};

		const config = {
			limit: 3,
			atLeast: 1,
			// orAfter: undefined
		};

		// step, context, config, input, done
		block.main(step, context, config, 'input', done);
		block.main(step, context, config, 'input', done);
		block.main(step, context, config, 'input', done);

		block.main(step, context, config, 'input', done);
		block.main(step, context, config, 'input', done);
		block.main(step, context, config, 'input', done);

		block.main(step, context, config, 'input', done);

		assert(callbackCounter === 2);
	});

	it('should obey `atLeast` option', () => {
		const step = {
			data: {
				collected: []
			}
		};

		const config = {
			limit: 1,
			atLeast: 2,
			// orAfter: undefined
		};

		let callbackCounter = 0;
		const done = (output) => {
			callbackCounter++;
		};

		block.main(step, context, config, 'input', done);
		block.main(step, context, config, 'input', done);
		block.main(step, context, config, 'input', done);

		assert(callbackCounter === 1);
	});

	it('should flush all at once, when input length >= `limit`', () => {
		const step = {
			data: {
				collected: []
			}
		};

		const config = {
			limit: 2
		};

		const input = ['input', 'input', 'input', 'input', 'input'];
		const done = (err, output) => {
			assert(output.length === input.length);
		};

		block.main(step, context, config, input, done);
	});

	it('should flush anyway after a timeout', (done) => {
		const step = {
			data: {
				collected: [],
				lastFlush: undefined,
				nextFlush: moment().format(),
			}
		};

		const config = {
			limit: 999,
			atLeast: 1,
			// orAfter: '1 seconds'
		};

		const cb = (output) => {
			assert(true);
			done();
		};

		block.main(step, context, config, 'input', cb);
	});
});
