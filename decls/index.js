
declare type Channel = {
  isClosed: bool,
  args: Array<any>,
  opts: Object,
  takes: Array<Action>,
  xduce: ?Object,
  buffer: Buffer,
  then: (a: Function, b: Function) => Promise<any>
}

declare type Action = {
  payload: any,
  resolve: (payload: any) => void,
  promise: Promise<any>
}

declare type Buffer = {
  unreleased?: Array<Action>,
  released?: Array<Action>,
  push: (a: Action) => void,
  shift: () => ?Action,
  isEmpty: () => boolean
}

declare type BufferConfig = Buffer | number
