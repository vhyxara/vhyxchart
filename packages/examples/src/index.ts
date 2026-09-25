import { traceArray } from '@vhyxchart/core';

/** A curated example. */
export interface Example {
  id: string;
  title: string;
  category: 'Architecture' | 'Flow' | 'Sequence' | 'Algorithm' | 'State';
  description: string;
  source: string;
}

const bubbleSort = traceArray('Bubble sort', [5, 1, 4, 2, 8], (a) => {
  const n = a.values.length;
  for (let i = 0; i < n - 1; i++) {
    a.pointer('i', n - i - 1);
    for (let j = 0; j < n - i - 1; j++) if (a.compare(j, j + 1) > 0) a.swap(j, j + 1);
    a.mark(n - i - 1, 'done');
  }
  a.mark(0, 'done');
  a.pointer('i', null);
  a.note('Sorted — the largest value bubbled up each pass');
});

const binarySearch = traceArray('Binary search for 23', [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], (a) => {
  let lo = 0;
  let hi = a.values.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    a.pointer('lo', lo);
    a.pointer('hi', hi);
    a.pointer('mid', mid);
    a.mark(mid, 'active');
    const v = a.values[mid] as number;
    if (v === 23) {
      a.mark(mid, 'done');
      a.note(`Found 23 at index ${mid}`);
      return;
    }
    a.unmark(mid);
    if (v < 23) {
      a.mark(Array.from({ length: mid - lo + 1 }, (_, k) => lo + k), 'skipped');
      lo = mid + 1;
    } else {
      a.mark(Array.from({ length: hi - mid + 1 }, (_, k) => mid + k), 'skipped');
      hi = mid - 1;
    }
  }
});

export const EXAMPLES: Example[] = [
  {
    id: 'checkout',
    title: 'Microservices checkout',
    category: 'Architecture',
    description: 'A request travels through a gateway into services and a queue. Two scenarios: the happy path and an auth failure.',
    source: `---
title: Checkout request
---
flowchart LR
  client([Browser]) --> gw[API Gateway]
  gw -->|verify| auth[Auth]
  gw --> orders[Orders]
  orders --> db[(Postgres)]
  orders -.-> queue{{Queue}}
  queue --> mail[Email worker]
  subgraph backend [Backend]
    auth
    orders
    db
  end

scenario Happy path
  client -> gw : POST /checkout
  gw -> auth : token
  auth is done
  gw -> orders
  orders is active
  orders -> db : insert
  db is done
  orders -> queue, orders -> gw
  note orders : Order #42 created
  queue -> mail : receipt
  mail is done
  gw -> client : 201 Created
  orders is done

scenario Token expired
  client -> gw : POST /checkout
  gw -> auth
  auth is error
  note auth : JWT expired
  gw -> client : 401
  client is warn
`,
  },
  {
    id: 'pipeline',
    title: 'CI/CD pipeline',
    category: 'Flow',
    description: 'Parallel jobs, a failing test, and a successful deploy — states drive the story.',
    source: `flowchart LR
  push([git push]) --> build[Build]
  build --> unit[Unit tests] & lint[Lint] & e2e[E2E tests]
  unit & lint & e2e --> gate{All green?}
  gate -->|yes| deploy[Deploy]
  gate -->|no| fix[Fix & retry]
  deploy --> prod[(Production)]

scenario Green build
  push -> build
  build is active
  wait 400ms
  build is done
  build -> unit, build -> lint, build -> e2e
  unit, lint, e2e are active
  wait 600ms
  unit, lint, e2e are done
  unit -> gate, lint -> gate, e2e -> gate
  gate -> deploy : yes
  deploy is active
  deploy -> prod
  prod, deploy are done
  caption Shipped to production

scenario Flaky E2E
  push -> build
  build is done
  build -> unit, build -> e2e
  unit is done
  e2e is error
  note e2e : timeout in checkout.spec.ts
  e2e -> gate
  gate -> fix : no
  fix is warn
`,
  },
  {
    id: 'fanout',
    title: 'Event fan-out',
    category: 'Architecture',
    description: 'One event, many consumers — parallel travel with `,` and `&`.',
    source: `flowchart TB
  api[Orders API] --> bus{{Event bus}}
  bus --> billing[Billing] & stock[Inventory] & email[Email] & analytics[(Warehouse)]

scenario order.created
  api -> bus : order.created
  bus -> billing & stock & email & analytics
  billing, stock, email are done
  analytics is active
  note analytics : batched every 5 min
`,
  },
  {
    id: 'oauth',
    title: 'OAuth 2.0 login',
    category: 'Sequence',
    description: 'Messages animate in order; activations, notes and alt blocks included.',
    source: `sequenceDiagram
  autonumber
  actor U as User
  participant App
  participant IdP as Identity provider
  database DB
  U->>App: Click "Sign in"
  App->>IdP: Redirect /authorize
  IdP->>U: Login page
  U->>IdP: Credentials
  alt valid
    IdP-->>App: code
    App->>+IdP: POST /token
    IdP-->>-App: access_token
    App->>DB: upsert user
    App-->>U: Signed in
  else invalid
    IdP-->>U: Try again
  end
`,
  },
  {
    id: 'handshake',
    title: 'TCP handshake',
    category: 'Sequence',
    description: 'The classic three-way handshake, then data.',
    source: `sequenceDiagram
  participant C as Client
  participant S as Server
  C->>S: SYN
  S->>C: SYN-ACK
  C->>S: ACK
  Note over C,S: connection established
  par
    C->>S: data
  and
    S->>C: data
  end
  C-)S: FIN
`,
  },
  {
    id: 'order-states',
    title: 'Order lifecycle',
    category: 'State',
    description: 'Mermaid stateDiagram syntax, animated.',
    source: `stateDiagram-v2
  [*] --> Pending
  Pending --> Paid : pay
  Paid --> Shipped : ship
  Shipped --> Delivered : deliver
  Pending --> Cancelled : cancel
  Delivered --> [*]
  Cancelled --> [*]

scenario Delivered
  __start_root -> Pending
  Pending is active
  Pending -> Paid : pay
  Paid is active
  Paid -> Shipped : ship
  Shipped -> Delivered : deliver
  Delivered is done
`,
  },
  {
    id: 'agent',
    title: 'AI agent with VhyxSeal',
    category: 'Architecture',
    description: 'An agent reads a signed manifest and asks the human before a critical action.',
    source: `flowchart LR
  agent([AI agent]) -->|GET| manifest[["/__agent__/manifest.json"]]
  agent --> ui[Checkout UI]
  ui --> confirm{Human confirms?}
  confirm -->|yes| pay[make-payment]:::danger
  confirm -->|no| stop[Stop]:::muted

scenario Safe purchase
  agent -> manifest : fetch contracts
  manifest is done
  note manifest : hmac-sha256 signature valid
  agent -> ui : place-order
  ui -> confirm
  confirm is warn
  note confirm : safetyLevel critical — ask the human
  wait 800ms
  confirm -> pay : yes
  pay is done
`,
  },
  { id: 'bubble', title: 'Bubble sort', category: 'Algorithm', description: 'Generated from a real sort with traceArray().', source: bubbleSort },
  { id: 'binary-search', title: 'Binary search', category: 'Algorithm', description: 'Pointers lo / mid / hi narrow the search.', source: binarySearch },
];

/** Looks up an example by id. */
export function getExample(id: string): Example | undefined {
  return EXAMPLES.find((e) => e.id === id);
}
