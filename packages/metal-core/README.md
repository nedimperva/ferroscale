# @ferroscale/metal-core

Shared calculation package used by the Ferroscale web app. It is also the
foundation for future non-web surfaces (e.g. a Raycast extension or CLI):
the command parser below is UI-independent and ready to reuse.

## What It Contains

1. Calculator engine and validation
2. Profile and material datasets
3. Command query parser and suggestions (the grammar behind the app's
   command bar, e.g. `hea120 6m x2 s235 @2.50/kg`)

## Run Tests

From repo root:

```bash
npm run test:core
```

From this folder:

```bash
npm run test
```

## Key Exports

1. `@ferroscale/metal-core/calculator`
2. `@ferroscale/metal-core/datasets`
3. `@ferroscale/metal-core/command`
