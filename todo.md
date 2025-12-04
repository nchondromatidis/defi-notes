# TODO

- temv-lens
  - Optimization: instead of caulculating the selector every time and compare it. Use indexes from function indexes task.
  - Supported contracts can index the function indexes by having multiple maps for different keys, pointing to same function data. 
      - eg function_data_array, map(keyX, function_data_array_index)
  - Create fn singature from ast in function indexes task
  - Fix: fallback or receive check after all inherited/lib abi checks.
  - Fix: Fallback, receive order per contract order. C3 inheritance.
- tevm-lens-ui
    - txTrace -> components
- analysis
    - Add dependency on protocols
    - while using analysis: fix tevm-lens when needed
