import { Lambda } from "@nagisham/standard";

import { handlers_state } from "./states";
import { StateProvider } from "./states/providers/types";
import { HandlersState } from "./states/types";

import { Cleanup, RegisterOptions, RegisterTypelessOptions, Type, empty } from "./types";

interface EngineConstructor {
	<STATE, API, RETURNS extends { [KEY in keyof STATE]: any }, PARAMS extends any[]>(options: {
		type?: Type;
		state_provider: StateProvider<HandlersState<STATE, API>>;
		runner: <TYPE extends keyof STATE>(
			handlers: Array<(args1: STATE[TYPE], api: API) => void>,
			...params: PARAMS
		) => RETURNS[TYPE];
	}): {
		emit: <TYPE extends keyof STATE>(
			...params: STATE[TYPE] extends empty ? [type: TYPE] : [type: TYPE, args: STATE[TYPE]]
		) => RETURNS[TYPE];
		register: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
			options: RegisterOptions<TYPE, API, STATE[TYPE], SELECTED>,
		) => Cleanup;
	};
	<
		STATE extends Record<Type, any>,
		API,
		RETURN,
		PARAMS extends any[],
		TYPE extends keyof STATE = STATE extends Record<infer T, any> ? T : never,
		ARGS = STATE extends Record<Type, infer A> ? A : never,
	>(options: {
		type?: TYPE;
		state_provider: StateProvider<HandlersState<STATE, API>>;
		runner: (handlers: Array<(args: ARGS, api: API) => void>, ...params: PARAMS) => RETURN;
		event: (params: PARAMS) => readonly [type: TYPE, ...params: PARAMS];
	}): {
		emit: (...params: PARAMS) => RETURN;
		register: <SELECTED = ARGS>(options: RegisterTypelessOptions<API, ARGS, SELECTED>) => Cleanup;
	};
}

export const eventable: EngineConstructor = <
	STATE extends Record<Type, any>,
	RETURNS extends { [KEY in keyof STATE]: any },
	API,
	PARAMS extends any[],
	TYPE extends keyof STATE = STATE extends Record<infer T, any> ? T : never,
>(options: {
	type?: TYPE;
	state_provider: StateProvider<HandlersState<STATE, API>>;
	runner: <TYPE extends keyof STATE>(
		handlers: Array<(args1: STATE[TYPE], api: API) => void>,
		...params: PARAMS
	) => RETURNS[TYPE];
	event?: (params: PARAMS) => readonly [type: TYPE, ...params: PARAMS];
}) => {
	const { runner, event } = options;
	const { get, set } = handlers_state<STATE, API>(options.type, options.state_provider);

	function emit(...params: PARAMS | [type: TYPE, ...params: PARAMS]) {
		const [type, ...args] = event
			? event(params as PARAMS)
			: (params as [type: TYPE, ...params: PARAMS]);

		return runner(get(type), ...args);
	}

	function register<TYPE extends keyof STATE, SELECTED>(
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

		function clear() {
			const index = handlers.indexOf(listener);
			if (index === -1) {
				console.warn("event engine: registered listener not found");
				return;
			}

			handlers.splice(index, 1);
		}

		Object.defineProperty(listener, "name", { value: name });

		let handlers = get(type);
		if (!handlers) set(type, (handlers = []));

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

		return clear;
	}

	return { emit, register };
};
