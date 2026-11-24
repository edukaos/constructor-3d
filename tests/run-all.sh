#!/usr/bin/env bash
# Corre todas las pruebas y falla si alguna no termina bien o tiene un FAIL.
cd "$(dirname "$0")" || exit 1
TESTS="t2 t3 t4 t5 t7 t8 t9 t10 t11 t12 t15 t16 t18 t19 t20 t21 t22 t23 t24 t25 t26 t27 t28 t29 t30 t31"
bad=0
for t in $TESTS; do
  out=$(timeout 420 node "$t.mjs" 2>&1); code=$?
  last=$(echo "$out" | grep -E 'OK|FALLAN|Error' | tail -1)
  echo "== $t (exit $code): $last"
  if [ $code -ne 0 ] || echo "$out" | grep -q '^FAIL'; then bad=1; echo "$out" | grep -E '^FAIL|Error' | head -5; fi
done
exit $bad
