'use strict';

const moment = require('moment');
const sf = require('sf');
const _ = require('lodash');
const R = require('ramda');
const parsingUtils = require('cause-utils/dist/parsing');


function main(step, context, config, input, done) {
	// sanity check: `limit` must be >= `atLeast`
	const limit = Math.max(config.limit, config.atLeast);

	if (!_.isEmpty(input)) {
		// doesn't care about what the input exactly is,
		// but it has to be an array in the end.
		input = (_.isArray(input))
			? input
			: [input];

		// add input to buffer
		step.data.collected = step.data.collected.concat(input);
		context.debug(
			sf('received {0} items, now: {1} / {2}',
				input.length,
				step.data.collected.length,
				limit
			)
		);
	} else {
		context.debug(`ignoring empty input: ${input}`);
	}

	// TODO: should it flush multiple times, or simply everything all at once?
	const allAtOnce = true;

	function setNextFlush() {
		const now = moment();
		step.data.lastFlush = now.format();

		const parsed = parsingUtils.time(config.orAfter);
		const dur = moment.duration(parsed);
		step.data.nextFlush = now.add(dur).format();
	}

	function flush() {
		let takeN = limit;
		if (allAtOnce) {
			takeN = step.data.collected.length;
		}

		context.debug('flushing ...');

		const output = R.take(takeN, step.data.collected);
		const decision = true;
		done(null, output, decision);
		step.data.collected = R.drop(takeN, step.data.collected);

		if (config.orAfter) {
			setNextFlush();
		}
	}

	// on first run:
	if (config.orAfter && !step.data.nextFlush) {
		setNextFlush();
	}

	// flush after a certain time, no matter if threshold
	// has been reached or not.
	if (step.data.nextFlush) {
		const now = moment();
		const timeToFlush = moment(step.data.nextFlush);
		if (now >= timeToFlush) {
			context.debug(`${config.orAfter} have passed`);
			if (step.data.collected.length > 0) { flush(); }
		}
	}

	// flush, once threshold is reached
	if (step.data.collected.length >= limit) {
		flush();
	}

	context.saveTask();
}


module.exports = {
	main: main,
	defaults: {
		config: {
			limit: 5,
			atLeast: 1,
			orAfter: false
		},
		data: {
			collected: [],
			lastFlush: 0,
			// nextFlush: undefined
		},
		description: "digest: <%=config.limit%>\n<%if (config.atLeast > 1) {%>at least: <%=config.atLeast%><%}%>\n<%if (config.orAfter) {%>or after: <%=config.orAfter%><%}%>"
	}
};
