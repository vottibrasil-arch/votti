import { Fragment, jsx, jsxs } from "react/jsx-runtime";

export { Fragment, jsx, jsxs };

export function jsxDEV(
  type: Parameters<typeof jsx>[0],
  props: Parameters<typeof jsx>[1],
  key?: Parameters<typeof jsx>[2],
  isStaticChildren?: boolean,
) {
  const factory = isStaticChildren ? jsxs : jsx;
  return factory(type, props, key);
}
