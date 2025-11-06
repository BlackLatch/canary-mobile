#import "AudioSessionManager.h"
#import <AVFoundation/AVFoundation.h>

@implementation AudioSessionManager

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(setAudioOutputToSpeaker:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSError *error = nil;
  AVAudioSession *audioSession = [AVAudioSession sharedInstance];

  // Set category to PlayAndRecord to allow both recording and playback
  [audioSession setCategory:AVAudioSessionCategoryPlayAndRecord
                    mode:AVAudioSessionModeDefault
                 options:AVAudioSessionCategoryOptionDefaultToSpeaker
                   error:&error];

  if (error) {
    reject(@"audio_session_error", @"Failed to configure audio session", error);
  } else {
    [audioSession setActive:YES error:&error];
    if (error) {
      reject(@"audio_session_error", @"Failed to activate audio session", error);
    } else {
      resolve(@YES);
    }
  }
}

@end
