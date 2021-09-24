import { Meteor } from 'meteor/meteor';

import { Livechat } from '../Livechat';
import { SettingsVersion4 } from '../../../../settings/server';

export let monitorAgents = false;
let actionTimeout = 60000;
let action = 'none';
let comment = '';

SettingsVersion4.watch('Livechat_agent_leave_action_timeout', (value) => {
	if (typeof value !== 'number') {
		return;
	}
	actionTimeout = value * 1000;
});

SettingsVersion4.watch('Livechat_agent_leave_action', (value) => {
	monitorAgents = value !== 'none';
	action = value as string;
});

SettingsVersion4.watch('Livechat_agent_leave_comment', (value) => {
	if (typeof value !== 'string') {
		return;
	}
	comment = value;
});

export const onlineAgents = {
	users: new Set(),
	queue: new Map(),

	add(userId: string): void {
		if (this.exists(userId)) {
			return;
		}

		if (this.queue.has(userId)) {
			clearTimeout(this.queue.get(userId));
			this.queue.delete(userId);
		}
		this.users.add(userId);
	},

	remove(userId: string): void {
		if (!this.exists(userId)) {
			return;
		}
		this.users.delete(userId);

		if (this.queue.has(userId)) {
			clearTimeout(this.queue.get(userId));
		}

		this.queue.set(userId, setTimeout(this.runAgentLeaveAction, actionTimeout, userId));
	},

	exists(userId: string): boolean {
		return this.users.has(userId);
	},

	runAgentLeaveAction: Meteor.bindEnvironment((userId: string) => {
		onlineAgents.users.delete(userId);
		onlineAgents.queue.delete(userId);

		if (action === 'close') {
			return Livechat.closeOpenChats(userId, comment);
		}

		if (action === 'forward') {
			return Livechat.forwardOpenChats(userId);
		}
	}),
};
