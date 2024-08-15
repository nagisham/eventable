import { in_memory_provider, Lens, Provider } from "@nagisham/standard";
import { event_runner } from "./runners";

export type HandlersState<STATE, API = void> = {
	[TYPE in keyof STATE]: Array<(args: STATE[TYPE], api: API) => void>;
};

interface EngineConstructor {
	<STATE, API>(options: { provider: Provider<HandlersState<STATE, API>> }): {};
}

export function eventable<STATE, RETURNS extends { [KEY in keyof STATE]: any }, API, PARAMS extends any[]>(options: {
	provider: Provider<{ [TYPE in keyof STATE]: Array<(args: STATE[TYPE], api: API) => void> }>;
	runner: <TYPE extends keyof STATE>(handlers: Array<(args1: STATE[TYPE], api: API) => void>, ...params: PARAMS) => RETURNS[TYPE];
	// event?: (params: PARAMS) => [type: TYPE, ...params: PARAMS];
}) {
	const { provider, runner } = options;
}

interface Count {
	value: number
}

const event = eventable<Count, { [K in keyof Count]: void }, void, any[]>({
	provider: in_memory_provider(<HandlersState<Count>>{}),
	runner: event_runner(),
});
