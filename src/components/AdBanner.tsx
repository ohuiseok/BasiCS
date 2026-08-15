import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { colors, radii } from '../theme';

const productionAdUnitId = Platform.select({
  android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID,
  ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS,
});

const adUnitId = __DEV__ || !productionAdUnitId ? TestIds.ADAPTIVE_BANNER : productionAdUnitId;

export function AdBanner() {
  return (
    <View style={styles.container}>
      <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
});
