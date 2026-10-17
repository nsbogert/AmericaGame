// Trim a sound effect, fade its edges, normalise its peak and export AAC (.m4a), using only macOS AVFoundation.
//   swift tools/trim-audio.swift envelope <in>                      → prints 100 ms RMS (dBFS) to pick a window
//   swift tools/trim-audio.swift trim <in> <out.m4a> <start> <end>  → trimmed, 20/150 ms fades, −1 dBFS peak
import AVFoundation

func fail(_ message: String) -> Never { FileHandle.standardError.write((message + "\n").data(using: .utf8)!); exit(1) }

func readMono(_ path: String) -> (samples: [Float], rate: Double) {
  guard let file = try? AVAudioFile(forReading: URL(fileURLWithPath: path)) else { fail("Cannot open \(path)") }
  let format = file.processingFormat, frames = AVAudioFrameCount(file.length)
  guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) else { fail("Cannot allocate buffer") }
  do { try file.read(into: buffer) } catch { fail("Cannot decode \(path): \(error)") }
  let channels = Int(format.channelCount), count = Int(buffer.frameLength)
  var mono = [Float](repeating: 0, count: count)
  for c in 0..<channels { let data = buffer.floatChannelData![c]; for i in 0..<count { mono[i] += data[i] / Float(channels) } }
  return (mono, format.sampleRate)
}

let args = CommandLine.arguments
guard args.count >= 3 else { fail("usage: envelope <in> | trim <in> <out.m4a> <start> <end>") }
let (samples, rate) = readMono(args[2])

if args[1] == "envelope" {
  let step = Int(rate / 10)
  print(String(format: "duration %.2fs", Double(samples.count) / rate))
  for start in stride(from: 0, to: samples.count, by: step) {
    let slice = samples[start..<min(start + step, samples.count)]
    let rms = sqrt(slice.reduce(0) { $0 + $1 * $1 } / Float(slice.count))
    let db = 20 * log10(max(rms, 1e-6))
    print(String(format: "%5.1fs %6.1f dB %@", Double(start) / rate, db, String(repeating: "#", count: max(0, Int((db + 60) / 2)))))
  }
} else if args[1] == "trim", args.count == 6, let start = Double(args[4]), let end = Double(args[5]) {
  let a = max(0, Int(start * rate)), b = min(samples.count, Int(end * rate))
  guard b > a else { fail("Empty window") }
  var clip = Array(samples[a..<b])
  let fadeIn = min(clip.count, Int(0.02 * rate)), fadeOut = min(clip.count, Int(0.15 * rate))
  for i in 0..<fadeIn { clip[i] *= Float(i) / Float(fadeIn) }
  for i in 0..<fadeOut { clip[clip.count - 1 - i] *= Float(i) / Float(fadeOut) }
  // Effects sit under voices in the mix, so a consistent −1 dBFS peak keeps the sfx slider meaningful.
  let peak = clip.map(abs).max() ?? 1, gain = peak > 0 ? Float(0.89) / peak : 1
  for i in clip.indices { clip[i] *= gain }
  let format = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 1)!
  let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(clip.count))!
  buffer.frameLength = AVAudioFrameCount(clip.count)
  clip.withUnsafeBufferPointer { buffer.floatChannelData![0].update(from: $0.baseAddress!, count: clip.count) }
  let url = URL(fileURLWithPath: args[3]); try? FileManager.default.removeItem(at: url)
  let settings: [String: Any] = [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: rate, AVNumberOfChannelsKey: 1, AVEncoderBitRateKey: 96000]
  do { let out = try AVAudioFile(forWriting: url, settings: settings); try out.write(from: buffer) } catch { fail("Cannot write \(args[3]): \(error)") }
  print(String(format: "wrote %@ (%.2fs, gain %.2f)", args[3], Double(clip.count) / rate, gain))
} else { fail("usage: envelope <in> | trim <in> <out.m4a> <start> <end>") }
