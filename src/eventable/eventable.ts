import { Lambda, Prefix, Provider, is_string } from "@nagisham/standard";

import {
  Cleanup,
  HandlersState,
  RegisterOptions,
  RegisterTypelessOptions,
  Type,
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
    ) => RETURNS[TYPE];
    register: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
      options: RegisterOptions<TYPE, API, STATE[TYPE], SELECTED>
    ) => Cleanup;
  };
  <
    STATE extends Record<Type, any>,
    API,
    RETURN,
    PARAMS extends any[],
    TYPE extends keyof STATE = STATE extends Record<infer T, any> ? T : never,
    ARGS = STATE extends Record<Type, infer A> ? A : never
  >(options: {
    provider: Provider<HandlersState<STATE, API>>;
    runner: (handlers: Array<(args: ARGS, api: API) => void>, ...params: PARAMS) => RETURN;
    event: (params: PARAMS) => readonly [type: TYPE, ...params: PARAMS];
  }): {
    emit: (...params: PARAMS) => RETURN;
    register: <SELECTED = ARGS>(options: RegisterTypelessOptions<API, ARGS, SELECTED>) => Cleanup;
  };
}

function handlers_state<STATE, API>(provider: Provider<HandlersState<STATE, API>>) {
  const default_type = Symbol();

  return {
    get: <TYPE extends keyof STATE>(type: TYPE | undefined) =>
      (provider.get()[(type ?? default_type) as TYPE] ??= []),
    set: <TYPE extends keyof STATE>(
      type: TYPE | undefined,
      handlers: Array<(args: STATE[TYPE], api: any) => void>
    ) => {
      const state = provider.get();
      state[(type ?? default_type) as TYPE] = handlers;
      provider.set(state);
    },
  };
}

const LISTENING_PREFIX = "listening:";

export type Listening<E> = {
  [K in keyof E as Prefix<typeof LISTENING_PREFIX, E>]: (next: E[K]) => void;
};

export const eventable: EngineConstructor = <
  STATE extends Record<Type, any>,
  RETURNS extends { [KEY in keyof STATE]: any },
  API,
  PARAMS extends any[],
  TYPE extends keyof STATE = STATE extends Record<infer T, any> ? T : never
>(options: {
  provider: Provider<HandlersState<STATE, API>>;
  runner: <TYPE extends keyof STATE>(
    handlers: Array<(args1: STATE[TYPE], api: API) => void>,
    ...params: PARAMS
  ) => RETURNS[TYPE];
  event?: (params: PARAMS) => readonly [type: TYPE, ...params: PARAMS];
}) => {
  const { runner, event } = options;
  const { get, set } = handlers_state(options.provider);

  function emit(...params: PARAMS | [type: TYPE, ...params: PARAMS]) {
    const [type, ...args] = event
      ? event(params as PARAMS)
      : (params as [type: TYPE, ...params: PARAMS]);

    const handlers = get(type);
    return runner(handlers, ...args);
  }

  function register<TYPE extends keyof STATE, SELECTED>(
    options: { type?: TYPE } & RegisterTypelessOptions<API, STATE[TYPE], SELECTED>
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

    let handlers = get(type);
    if (!handlers) set(type, (handlers = []));

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
      if (!handlers) return;

      const index = handlers.indexOf(listener);
      if (index === -1) {
        console.warn("event engine: registered listener not found");
        return;
      }

      handlers.splice(index, 1);
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

  return { emit, register };
};
