#!/usr/bin/env perl

use common::sense;

use Data::Dumper;


while(1) {
  my $v = {};

  $v->{DIR1} = ["buy","sell"]->[int(rand(2))];
  $v->{PRICE1} = 1 + int(rand(99));
  $v->{AMOUNT1} = 1 + int(rand(100000));

  $v->{DIR2} = ["buy","sell"]->[int(rand(2))];
  $v->{PRICE2} = 1 + int(rand(99));
  $v->{AMOUNT2} = 1 + int(rand(100000));

  $v->{DIR3} = ["buy","sell"]->[int(rand(2))];
  $v->{PRICE3} = 1 + int(rand(99));
  $v->{AMOUNT3} = 1 + int(rand(100000));

  print Dumper($v);

  foreach my $k (keys %$v) {
    $ENV{$k} = $v->{$k};
  }

  my $ret = system("node t/fuzz/fuzz.js");
  if ($ret) {
    print Dumper($v);
    exit 1;
  }
}
