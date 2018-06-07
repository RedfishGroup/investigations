#!/usr/bin/env bash

files=`ls pngs/*png`
for file in $files; do
  echo "'./$file',"
done

