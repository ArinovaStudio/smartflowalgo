import { transpileToPineJS } from "@opus-aether-ai/pine-transpiler";

const pineScript = `//@version=5
indicator("Test Sec")
val = request.security(syminfo.tickerid, "60", close)
plot(val)
`;

const res = transpileToPineJS(pineScript, "test", "Test Sec");
console.log("Success:", res.success);
if (res.indicatorFactory) {
  const dummyPineJS = { Std: {} };
  const indicator = res.indicatorFactory(dummyPineJS);
  const instance = new (indicator.constructor)();
  const mainStr = instance.main.toString();
  const secIdx = mainStr.indexOf("if (targe");
  console.log("Found if (targe at:", secIdx);
  if (secIdx >= 0) {
    console.log(mainStr.slice(secIdx, secIdx + 1500));
  }
}
