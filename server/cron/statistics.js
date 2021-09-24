import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

import { getWorkspaceAccessToken } from '../../app/cloud/server';
import { statistics } from '../../app/statistics';
import { SettingsVersion4 } from '../../app/settings';

function generateStatistics(logger) {
	const cronStatistics = statistics.save();

	cronStatistics.host = Meteor.absoluteUrl();

	if (!SettingsVersion4.get('Statistics_reporting')) {
		return;
	}

	try {
		const headers = {};
		const token = getWorkspaceAccessToken();

		if (token) {
			headers.Authorization = `Bearer ${ token }`;
		}

		HTTP.post('https://collector.rocket.chat/', {
			data: cronStatistics,
			headers,
		});
	} catch (error) {
		/* error*/
		logger.warn('Failed to send usage report');
	}
}

export function statsCron(SyncedCron, logger) {
	if (SettingsVersion4.get('Troubleshoot_Disable_Statistics_Generator')) {
		return;
	}

	const name = 'Generate and save statistics';

	let previousValue;
	SettingsVersion4.watch('Troubleshoot_Disable_Statistics_Generator', (value) => {
		if (value === previousValue) {
			return;
		}
		previousValue = value;

		if (value) {
			SyncedCron.remove(name);
			return;
		}

		generateStatistics(logger);

		SyncedCron.add({
			name,
			schedule(parser) {
				return parser.cron('12 * * * *');
			},
			job: () => generateStatistics(logger),
		});
	});
}
