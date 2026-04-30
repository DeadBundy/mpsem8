import PDFDocument from 'pdfkit';
import type { AnalyticsData } from './analytics';

export function generateMoodReportPDF(data: AnalyticsData): Buffer {
  const doc = new PDFDocument({ size: 'letter', margin: 50 });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.on('end', () => {});

  // Title
  doc.fontSize(24).font('Helvetica-Bold').text('MindWellAI', { align: 'center' });
  doc.fontSize(16).text('Mood & Analytics Report', { align: 'center' });
  doc.fontSize(10).fillColor('gray').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown();

  // Summary Section
  doc.fontSize(14).fillColor('black').font('Helvetica-Bold').text('📊 Summary');
  doc.fontSize(11).fillColor('black').font('Helvetica');
  doc.text(`Average Mood Score: ${data.averageMood.toFixed(2)}/4.0`);
  doc.text(`Mood Trend: ${data.moodTrend}`);
  doc.text(`Total Sessions: ${data.totalSessions}`);
  doc.moveDown();

  // Emotion Distribution
  doc.fontSize(14).font('Helvetica-Bold').text('😊 Emotion Distribution');
  doc.fontSize(11).font('Helvetica');
  data.dominantEmotions.slice(0, 5).forEach(e => {
    doc.text(`  ${e.emotion}: ${e.count} times`);
  });
  doc.moveDown();

  // Sentiment Analysis
  doc.fontSize(14).font('Helvetica-Bold').text('💬 Sentiment Analysis');
  doc.fontSize(11).font('Helvetica');
  doc.text(`Average Sentiment Score: ${data.sentimentAnalysis.averageSentiment.toFixed(2)}`);
  doc.text(`Positive Messages: ${data.sentimentAnalysis.positiveMessages}`);
  doc.text(`Negative Messages: ${data.sentimentAnalysis.negativeMessages}`);
  doc.moveDown();

  // Insights
  doc.fontSize(14).font('Helvetica-Bold').text('💡 Insights');
  doc.fontSize(11).font('Helvetica');
  data.insights.forEach(insight => {
    doc.text(`  • ${insight}`, { width: 450, align: 'left' });
  });
  doc.moveDown();

  // Predictions
  doc.fontSize(14).font('Helvetica-Bold').text('🔮 Predictions');
  doc.fontSize(11).font('Helvetica');
  doc.text(`Predicted Next Mood: ${data.predictedMood}`);
  doc.moveDown();

  // Risk Factors (if any)
  if (data.riskFactors.length > 0) {
    doc.fontSize(14).fillColor('red').font('Helvetica-Bold').text('⚠️ Risk Factors Detected');
    doc.fontSize(11).fillColor('black').font('Helvetica');
    data.riskFactors.forEach(risk => {
      doc.text(`  • ${risk}`);
    });
    doc.moveDown();
    doc.fontSize(10).fillColor('red').text(
      'If you are in crisis, please reach out to a mental health professional or crisis helpline.'
    );
  }

  // Footer
  doc.fontSize(9).fillColor('gray').text(
    'This report is for personal reference. Please consult a mental health professional for clinical advice.',
    { align: 'center' }
  );

  doc.end();

  return Buffer.concat(chunks);
}
