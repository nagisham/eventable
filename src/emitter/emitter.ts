import { eventable } from "src/eventable";

import { event_runner } from "src/eventable/runners";
import { in_memory_state_provider } from "src/eventable/states/providers";
import { HandlersState } from "src/eventable/states/types";

export function emitter<STATE>() {
	return eventable({
		state_provider: in_memory_state_provider<HandlersState<STATE>>({}),
		runner: event_runner(),
	});
}
