// Credits: https://medium.com/trabe/prevent-click-events-on-double-click-with-react-with-and-without-hooks-6bf3697abc40
// Ceci García García

export const cancelablePromise = (promise: Promise<any>) => {
  let isCanceled = false;

  const wrappedPromise = new Promise((resolve, reject) => {
    promise.then(
      (value) => (isCanceled ? reject({ isCanceled, value }) : resolve(value)),
      (error) => reject({ isCanceled, error })
    );
  });

  return {
    promise: wrappedPromise,
    cancel: () => (isCanceled = true),
  };
};
