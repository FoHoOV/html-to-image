export const uuid = (() => {
  // generate uuid for className of pseudo elements.
  // We should not use GUIDs, otherwise pseudo elements sometimes cannot be captured.
  let counter = 0;

  // ref: http://stackoverflow.com/a/6248722/2519373
  const random = () =>
    `0000${((Math.random() * 36 ** 4) << 0).toString(36)}`.slice(-4);

  return () => {
    counter += 1;
    return `u${random()}${counter}`;
  };
})();
