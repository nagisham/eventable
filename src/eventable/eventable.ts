import { Lambda, Prefix, Provider, Task, is_string } from "@nagisham/standard";

import {
	Cleanup,
	Events,
	HandlersState,
	RegisterOptions,
	RegisterTypelessOptions,
	empty,
} from "./types";

interface EngineConstructor {
	<STATE, API, RETURNS extends { [KEY in keyof STATE]: any }, PARAMS extends any[]>(options: {
		provider: Provider<HandlersState<STATE, API>>;
		runner: <TYPE extends keyof STATE>(
			handlers: Array<(args1: STATE[TYPE], api: API) => void>,
			...params: PARAMS
		) => RETURNS[TYPE];
	}): {
		emit: <TYPE extends keyof STATE>(
			...params: STATE[TYPE] extends empty ? [type: TYPE] : [type: TYPE, args: STATE[TYPE]]
		) => Task<RETURNS[TYPE]>;
		listen: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
			options: RegisterOptions<TYPE, API, STATE[TYPE], SELECTED>,
		) => Task<Cleanup>;
	};
	<
		STATE extends Record<string, any>,
		API,
		RETURN,
		PARAMS extends any[],
		TYPE extends keyof STATE = STATE extends Record<infer T, any> ? T : never,
		ARGS = STATE extends Record<string, infer A> ? A : never,
	>(options: {
		provider: Provider<HandlersState<STATE, API>>;
		runner: (handlers: Array<(args: ARGS, api: API) => void>, ...params: PARAMS) => RETURN;
		event: (params: PARAMS) => [type: TYPE, ...params: PARAMS];
	}): {
		emit: (...params: PARAMS) => Task<RETURN>;
		listen: <SELECTED = ARGS>(
			options: RegisterTypelessOptions<API, ARGS, SELECTED>,
		) => Task<Cleanup>;
	};
}

function handlers_state<STATE, API>(provider: Provider<HandlersState<STATE, API>>) {
	const default_type = Symbol();

	return {
		get: async <TYPE extends keyof STATE>(type: TYPE | undefined = default_type as TYPE) => {
			const state = await provider.get();
			return (state[type] ??= []);
		},
		set: async <TYPE extends keyof STATE>(
			type: TYPE | undefined = default_type as TYPE,
			handlers: Array<(args: STATE[TYPE], api: any) => void>,
		) => {
			const state = await provider.get();
			state[type] = handlers;
			provider.set(state);
		},
	};
}

const LISTENING_PREFIX = "listening:";

export type Listening<EVENTS extends Events> = {
	[K in keyof EVENTS as Prefix<typeof LISTENING_PREFIX, EVENTS>]: (next: EVENTS[K]) => void;
};

function event_default<TYPE, PARAMS extends any[]>(params: PARAMS | [type: TYPE, ...params: PARAMS]) {
	return params as [type: TYPE, ...params: PARAMS]
}

export const eventable: EngineConstructor = <
	STATE extends Record<string, any>,
	RETURNS extends { [KEY in keyof STATE]: any },
	API,
	PARAMS extends any[],
	TYPE extends string,
>(options: {
	provider: Provider<HandlersState<STATE, API>>;
	runner: <TYPE extends keyof STATE>(
		handlers: Array<(args1: STATE[TYPE], api: API) => void>,
		...params: PARAMS
	) => RETURNS[TYPE];
	event?: (params: PARAMS) => [type: TYPE, ...params: PARAMS];
}) => {
	const { provider, runner, event } = Object.assign({ event: event_default<TYPE, PARAMS> }, options);
	const { get, set } = handlers_state(provider);

	async function emit(...params: PARAMS | [type: TYPE, ...params: PARAMS]) {
		const [type, ...args] = event(params);
		const handlers = await get(type);
		return runner(handlers, ...args);
	}

	async function listen<TYPE extends keyof STATE, SELECTED>(
		options: { type?: TYPE } & RegisterTypelessOptions<API, STATE[TYPE], SELECTED>,
	) {
		const { type = "default", patch, select, handler } = options;

		let mode: "once" | "each";
		let name: string;
		let handle: Lambda<[args: SELECTED | void, api?: API], void>;

		if (typeof handler === "function") {
			mode = "each";
			name = "handle";
			handle = handler as Lambda<[args: SELECTED | void, api?: API], void>;
		} else {
			mode = handler.mode ?? "each";
			name = handler.name ?? "handle";
			handle = handler.handle as Lambda<[args: SELECTED | void, api?: API], void>;
		}

		Object.defineProperty(listener, "name", { value: name });

		let handlers = await get(type);
		if (!handlers) await set(type, (handlers = []));

		function listener(args: SELECTED | void, api?: API) {
			if (select) {
				args &&= select(args);
			}

			switch (mode) {
				case "each":
					handle(args, api);
					break;
				case "once":
					handle(args, api);
					clear();
					break;
				default:
					console.error("wrong handler mode");
					break;
			}
		}

		async function clear() {
			let handlers = await get(type);

			const index = handlers.indexOf(listener);
			if (index === -1) {
				console.warn("event engine: registered listener not found");
				return;
			}

			handlers.splice(index, 1);
			await set(type, (handlers = []));
		}

		switch (patch?.mode) {
			case "prepend": {
				handlers.splice(0, 0, listener);
				break;
			}
			case "append": {
				handlers.push(listener);
				break;
			}
			case "after": {
				const index = handlers.findIndex((handler) => handler.name === patch.name);
				handlers.splice(index + 1, 0, listener);
				break;
			}
			case "before": {
				const index = handlers.findIndex((handler) => handler.name === patch.name);
				handlers.splice(index, 0, listener);
				break;
			}
			case "instead": {
				const index = handlers.findIndex((handler) => handler.name === patch.name);
				handlers.splice(index, 1, listener);
				break;
			}
			default: {
				handlers.push(listener);
				break;
			}
		}

		if (is_string(type) && !type.startsWith(LISTENING_PREFIX)) {
			// @ts-expect-error
			emit(LISTENING_PREFIX + type, listener);
		}

		return clear;
	}

	return { emit, listen };
};
