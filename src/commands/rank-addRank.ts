import { Role } from 'discord.js';
import {
	Command,
	CommandDecorators,
	Logger,
	logger,
	Message,
	Middleware
} from 'yamdbf';

import { IMClient } from '../client';
import { LogAction, ranks, roles, members } from '../sequelize';
import { CommandGroup, logAction } from '../utils/util';

const { resolve, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command<IMClient> {
	@logger('Command') private readonly _logger: Logger;

	public constructor() {
		super({
			name: 'add-rank',
			aliases: ['addRank', 'set-rank', 'setRank'],
			desc: 'Add a new rank',
			usage: '<prefix>add-rank @role invites (info)',
			info:
				'`' +
				'@role    The role which the user will receive when reaching this rank\n' +
				'invites  The amount of invites needed to reach the rank\n' +
				'info     A decription that users will see so they know more about this rank' +
				'`',
			callerPermissions: ['ADMINISTRATOR', 'MANAGE_CHANNELS', 'MANAGE_ROLES'],
			group: CommandGroup.Ranks,
			guildOnly: true
		});
	}

	@using(resolve('role: Role, invites: Number, ...description: String'))
	@using(expect('role: Role, invites: Number'))
	public async action(
		message: Message,
		[role, invites, description]: [Role, number, string]
	): Promise<any> {
		this._logger.log(
			`${message.guild.name} (${message.author.username}): ${message.content}`
		);

		await roles.insertOrUpdate({
			id: role.id,
			name: role.name,
			guildId: role.guild.id,
			color: role.hexColor,
			createdAt: role.createdAt
		});

		const myRole = message.guild.me.highestRole;
		// Check if we are higher then the role we want to assign
		if (myRole.position < role.position) {
			message.channel.send(
				`The role ${role.toString()} is higher up than my role ` +
					`(${myRole.toString()}), so I won't be able to assign it ` +
					`to members that earn it.`
			);
			return;
		}

		let rank = await ranks.find({
			where: {
				guildId: role.guild.id,
				roleId: role.id
			},
			paranoid: false // Turn off paranoid mode, because if this rank already exists we need to reuse it
		});

		let isNew = false;
		if (rank) {
			if (rank.deletedAt !== null) {
				isNew = true;
			}
			rank.numInvites = invites;
			rank.description = description;
			rank.setDataValue('deletedAt', null);
			rank.save();
		} else {
			rank = await ranks.create({
				id: null,
				guildId: role.guild.id,
				roleId: role.id,
				numInvites: invites,
				description,
				deletedAt: null
			});
			isNew = true;
		}

		await logAction(message, isNew ? LogAction.addRank : LogAction.updateRank, {
			rankId: rank.id,
			roleId: role.id,
			numInvites: invites,
			description
		});

		if (!isNew) {
			message.channel.send(
				`Rank ${role.toString()} updated: Now needs ${invites} ` +
					`and has the following description: "${
						description ? description : ''
					}"`
			);
		} else {
			message.channel.send(
				`Added rank ${role.toString()} which needs ${invites} ` +
					`and has the following description: "${
						description ? description : ''
					}"`
			);
		}
	}
}
