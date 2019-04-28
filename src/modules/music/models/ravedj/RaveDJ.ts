import axios from 'axios';

import { IMClient } from '../../../../client';
import { MusicPlatformTypes } from '../../../../types';
import { MusicItem } from '../MusicItem';
import { MusicPlatform } from '../MusicPlatform';

import { RaveDJMusicItem } from './RaveDJMusicItem';

export interface Thumbnails {
	standard: string;
	maxres: string;
	medium: string;
	default: string;
	high: string;
}

export interface Medium {
	artist: string;
	id: string;
	provider: string;
	providerId: string;
	thumbnails: Thumbnails;
	title: string;
}

export interface Thumbnails2 {
	360: string;
	480: string;
	720: string;
	default: string;
}

export interface Urls {
	720: string;
	default: string;
	audio: string;
}

export interface Data {
	artist: string;
	createdAt: number;
	duration: number;
	id: string;
	media: Medium[];
	percentageComplete: number;
	stage: string;
	style: string;
	thumbnails: Thumbnails2;
	timeEstimate: number;
	title: string;
	updatedAt: number;
	urls: Urls;
}

export interface RaveDjResponse {
	data: Data;
}

const RAVE_DJ_GOOGLE_KEY = 'AIzaSyCB24TzTgYXl4sXwLyeY8y-XXgm0RX_eRQ';

export interface IdTokenResponse {
	kind: string;
	idToken: string;
	refreshToken: string;
	expiresIn: string;
	localId: string;
}

export class RaveDJ extends MusicPlatform {
	public supportsRewind: boolean = true;
	public supportsSeek: boolean = true;
	public supportsLyrics: boolean = false;
	public supportsSearch: boolean = false;

	private idToken: string;

	public constructor(client: IMClient) {
		super(client);
		this.getIdToken();
	}

	public isPlatformUrl(url: string): boolean {
		return url.startsWith('https://rave.dj');
	}

	public getType(): MusicPlatformTypes {
		return MusicPlatformTypes.RaveDJ;
	}

	private async getIdToken() {
		const { data } = await axios.post<IdTokenResponse>(
			`https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${RAVE_DJ_GOOGLE_KEY}`,
			null,
			{
				headers: {
					Referer: 'https://rave.dj/'
				}
			}
		);
		this.idToken = data.idToken;
	}

	public async getByLink(link: string): Promise<MusicItem> {
		const id = link.substr(link.indexOf('.dj/') + 4);

		const res = await axios.get<RaveDjResponse>(
			`https://api.red.wemesh.ca/ravedj/${id}`,
			{
				headers: {
					authorization: `bearer ${this.idToken}`,
					'client-version': '5.0',
					'wemesh-api-version': '5.0',
					'wemesh-platform': 'Android',
					'content-type': 'application/json'
				}
			}
		);

		const data: Data = res.data.data;

		if (!data) {
			throw new Error('INVALID_PLATFORM_URL');
		}

		return new RaveDJMusicItem(this, {
			id: data.id,
			title: data.title,
			link: `https://rave.dj/${data.id}`,
			imageUrl: data.thumbnails.default,
			artist: data.artist,
			audioUrl: data.urls.audio,
			duration: data.duration,
			medias: data.media
		});
	}

	public search(searchTerm: string, maxResults?: number): Promise<MusicItem[]> {
		throw new Error('Method not implemented.');
	}

	public async mix(video1: string, video2: string): Promise<string> {
		const requestObject: any = {
			style: 'MASHUP',
			title: null,
			media: [
				{
					providerId: video1,
					provider: 'YOUTUBE'
				},
				{
					providerId: video2,
					provider: 'YOUTUBE'
				}
			]
		};

		const options = {
			method: 'POST',
			url: 'https://api.red.wemesh.ca/ravedj',
			data: requestObject,
			headers: {
				authorization: `bearer ${this.idToken}`,
				'client-version': '5.0',
				'wemesh-api-version': '5.0',
				'wemesh-platform': 'Android',
				'content-type': 'application/json'
			}
		};

		const { data } = await axios(options);
		console.log(data);

		return data.data.id;
	}
}