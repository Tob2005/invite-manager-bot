import { Message, TextChannel } from 'eris';

import { IMClient } from '../../../client';
import { Command, Context } from '../../../framework/commands/Command';
import { InviteCodeSettingsKey } from '../../../framework/models/InviteCodeSetting';
import { BooleanResolver, ChannelResolver, NumberResolver, StringResolver } from '../../../framework/resolvers';
import { CommandGroup, GuildPermission, InvitesCommand } from '../../../types';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: InvitesCommand.createInvite,
			aliases: ['create-invite'],
			args: [
				{
					name: 'name',
					resolver: StringResolver,
					required: true
				},
				{
					name: 'channel',
					resolver: ChannelResolver
				},
				{
					name: 'maxUses',
					resolver: NumberResolver
				},
				{
					name: 'expires',
					resolver: BooleanResolver
				},
				{
					name: 'temporaryMembership',
					resolver: BooleanResolver
				}
			],
			group: CommandGroup.Invites,
			botPermissions: [GuildPermission.CREATE_INSTANT_INVITE],
			guildOnly: true,
			defaultAdminOnly: true,
			extraExamples: ['!createInvite reddit', '!createInvite website #welcome']
		});
	}

	public async action(
		message: Message,
		[name, _channel, _maxUses, _expires, temporaryMembership]: [string, TextChannel, number, boolean, boolean],
		flags: {},
		{ guild, t, me }: Context
	): Promise<any> {
		const channel = _channel ? _channel : (message.channel as TextChannel);
		const maxUses = _maxUses ? _maxUses : 0;
		const expires = _expires ? 60 * 60 * 24 : 0; // default to 24 hours

		if (!channel.permissionsOf(me.id).has(GuildPermission.CREATE_INSTANT_INVITE)) {
			return this.sendReply(message, t('permissions.createInstantInvite'));
		}

		const inv = await this.client.createChannelInvite(
			channel.id,
			{
				maxAge: expires,
				maxUses: maxUses,
				temporary: temporaryMembership,
				unique: true
			},
			name ? encodeURIComponent(name) : undefined
		);

		await this.client.db.saveChannels([
			{
				id: inv.channel.id,
				name: inv.channel.name,
				guildId: guild.id
			}
		]);

		await this.client.db.saveInviteCodes([
			{
				code: inv.code,
				maxAge: 0,
				maxUses: 0,
				createdAt: new Date(inv.createdAt),
				temporary: false,
				channelId: inv.channel.id,
				uses: 0,
				guildId: inv.guild.id,
				inviterId: message.author.id,
				clearedAmount: 0,
				isVanity: false,
				isWidget: false
			}
		]);

		await this.client.cache.inviteCodes.setOne(guild.id, inv.code, InviteCodeSettingsKey.name, name);

		return this.sendReply(
			message,
			t('cmd.createInvite.done', {
				code: `https://discord.gg/${inv.code}`,
				channel: `<#${channel.id}>`,
				name
			})
		);
	}
}
