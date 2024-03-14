import { in_memory_provider } from "@nagisham/standard";

import { eventable } from "src/eventable";
import { PipelineApi, pipeline_runner } from "src/eventable/runners";
import { Cleanup, HandlersState, RegisterTypelessOptions } from "src/eventable/types";

import { PipelineOptions } from "./types";

export interface Pipeline<ARGS = any, PARAMS extends any[] = [args: ARGS], RETURN = ARGS> {
	emit: (...params: PARAMS) => RETURN;
	listen: <SELECTED = ARGS>(
		options: RegisterTypelessOptions<PipelineApi, ARGS, SELECTED>,
	) => Cleanup;
}

export const pipeline = <ARGS, PARAMS extends any[] = [args: ARGS], RETURN = ARGS>(
	options?: PipelineOptions<ARGS, PARAMS, RETURN>,
): Pipeline<ARGS, PARAMS, RETURN> => {
	const { request, response, middleware, handlers } = options ?? {};
	const type = Symbol();

	type STATE = Record<typeof type, ARGS>;
	type RETURNS = Record<typeof type, RETURN>;

	return eventable({
		provider: in_memory_provider<HandlersState<STATE, PipelineApi>>({ [type]: handlers ?? [] }),
		runner: pipeline_runner<STATE, PARAMS, RETURNS>({
			request,
			response,
			middleware,
		}),
		event: (params: PARAMS) => <const>[type, ...params],
	});
};
