import { Lambda } from "@nagisham/standard";

import { eventable } from "src/eventable";

import { PipelineApi, pipeline_runner } from "src/eventable/runners";
import { in_memory_state_provider } from "src/eventable/states/providers";
import { HandlersState } from "src/eventable/states/types";

interface PipelineOptions<STATE, PARAMS extends any[], RETURN> {
	request?: ((...params: PARAMS) => STATE) | undefined;
	response?: ((args: STATE) => RETURN) | undefined;
	midleware?:
		| ((handler: (args: STATE, API: PipelineApi) => void, arg: STATE, api: PipelineApi) => void)
		| undefined;
	handlers?: Array<Lambda<[args: STATE, api: PipelineApi], void>>;
}

export const pipeline = <ARGS, PARAMS extends any[] = [args: ARGS], RETURN = ARGS>(
	options?: PipelineOptions<ARGS, PARAMS, RETURN>,
) => {
	const { request, response, midleware, handlers } = options ?? {};
	const type = Symbol();

	type STATE = Record<typeof type, ARGS>;
	type RETURNS = Record<typeof type, RETURN>;

	return eventable({
		type,
		state_provider: in_memory_state_provider<HandlersState<STATE, PipelineApi>>({
			[type]: handlers ?? [],
		}),
		runner: pipeline_runner<STATE, PARAMS, RETURNS>({
			request,
			response,
			midleware,
		}),
		event: (params: PARAMS) => <const>[type, ...params],
	});
};
