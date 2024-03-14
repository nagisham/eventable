import { in_memory_provider } from "@nagisham/standard";

import { eventable } from "src/eventable";
import { Listening } from "src/eventable/eventable";
import { event_runner } from "src/eventable/runners";
import { Cleanup, Events, HandlersState, RegisterOptions, empty } from "src/eventable/types";

type DefaultEmitter<EVENTS extends Events = Events> = {
	emit: <TYPE extends keyof EVENTS>(
		...params: EVENTS[TYPE] extends empty ? [type: TYPE] : [type: TYPE, args: EVENTS[TYPE]]
	) => void;
	listen: <TYPE extends keyof EVENTS, SELECTED = EVENTS[TYPE]>(
		options: RegisterOptions<TYPE, void, EVENTS[TYPE], SELECTED>,
	) => Cleanup;
};

export type Emitter<EVENTS extends Events = Events> = DefaultEmitter<EVENTS & Listening<EVENTS>>;

export function emitter<EVENTS extends Events>(): Emitter<EVENTS> {
	return eventable({
		provider: in_memory_provider(<HandlersState<EVENTS>>{}),
		runner: event_runner(),
	});
}
