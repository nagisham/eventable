import { in_memory_provider } from "@nagisham/standard";

import { eventable } from "src/eventable";
import { event_runner } from "src/eventable/runners";
import { Cleanup, HandlersState, RegisterOptions, empty } from "src/eventable/types";

export type Emiter<EVENTS = any> = {
	emit: <TYPE extends keyof EVENTS>(
		...params: EVENTS[TYPE] extends empty ? [type: TYPE] : [type: TYPE, args: EVENTS[TYPE]]
	) => void;
	register: <TYPE extends keyof EVENTS, SELECTED = EVENTS[TYPE]>(
		options: RegisterOptions<TYPE, void, EVENTS[TYPE], SELECTED>,
	) => Cleanup;
};

export function emiter<EVENTS>(): Emiter<EVENTS> {
	return eventable({
		provider: in_memory_provider(<HandlersState<EVENTS>>{}),
		runner: event_runner(),
	});
}
