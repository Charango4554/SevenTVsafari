type DomObserverCallback = (element: Element) => void;

export interface DomObserverOptions {
  once?: boolean;
  emitExisting?: boolean;
  root?: ParentNode | (() => ParentNode | null);
}

interface DomObserverSubscription {
  selector: string;
  callback: DomObserverCallback;
  options: DomObserverOptions;
  seen: WeakSet<Element>;
}

function resolveRoot(
  root: DomObserverOptions["root"],
): ParentNode | null {
  if (!root) {
    return document;
  }

  return typeof root === "function" ? root() : root;
}

function collectMatchingElements(
  selector: string,
  source: ParentNode,
): Element[] {
  const matches = new Set<Element>();

  if (source instanceof Element && source.matches(selector)) {
    matches.add(source);
  }

  for (const element of source.querySelectorAll(selector)) {
    matches.add(element);
  }

  return [...matches];
}

export class DOMObserver {
  private readonly subscriptions = new Set<DomObserverSubscription>();
  private observer: MutationObserver | null = null;
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    const startObserver = (): void => {
      if (this.observer || !document.documentElement) {
        return;
      }

      this.observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof Element) {
              this.scanNode(node);
            }
          }
        }
      });

      this.observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      this.scanAll();
    };

    if (document.documentElement) {
      startObserver();
    } else {
      document.addEventListener("DOMContentLoaded", startObserver, { once: true });
    }
  }

  on(
    selector: string,
    callback: DomObserverCallback,
    options: DomObserverOptions = {},
  ): () => void {
    const subscription: DomObserverSubscription = {
      selector,
      callback,
      options,
      seen: new WeakSet<Element>(),
    };

    this.subscriptions.add(subscription);
    this.start();

    if (options.emitExisting !== false) {
      this.scanSubscription(subscription);
    }

    return () => {
      this.subscriptions.delete(subscription);
    };
  }

  private scanAll(): void {
    for (const subscription of this.subscriptions) {
      this.scanSubscription(subscription);
    }
  }

  private scanNode(node: Element): void {
    for (const subscription of this.subscriptions) {
      this.scanSubscription(subscription, node);
    }
  }

  private scanSubscription(
    subscription: DomObserverSubscription,
    source?: ParentNode,
  ): void {
    const root = resolveRoot(subscription.options.root);
    if (!root) {
      return;
    }

    if (source && root instanceof Node && !root.contains(source as Node) && source !== root) {
      return;
    }

    const scanSource = source ?? root;
    const elements = collectMatchingElements(subscription.selector, scanSource);

    for (const element of elements) {
      if (subscription.seen.has(element)) {
        continue;
      }

      subscription.seen.add(element);
      subscription.callback(element);

      if (subscription.options.once) {
        this.subscriptions.delete(subscription);
        break;
      }
    }
  }
}

export const domObserver = new DOMObserver();
