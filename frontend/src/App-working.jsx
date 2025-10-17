import React, { useState } from 'react'
import { WalletProvider, useWallet } from './context/WalletContext-simple.jsx'

// Simple Header Component
const Header = ({ currentView = 'dashboard' }) => {
  const { account, isConnected, connectWallet, disconnectWallet, getShortAddress } = useWallet()

  const getViewTitle = () => {
    switch(currentView) {
      case 'education': return '🎓 Education'
      case 'certification': return '🏆 Certifications'
      case 'experience': return '💼 Experience'
      case 'achievement': return '🏅 Achievements'
      default: return '🛡️ BlockchainCV'
    }
  }

  return (
    <header style={{
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      color: 'white',
      padding: '1rem 2rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{getViewTitle()}</h1>
        </div>

        <div>
          {isConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.2)',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem'
              }}>
                <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
                <span>{getShortAddress(account)}</span>
              </div>
              <button
                onClick={disconnectWallet}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              🔗 Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

// Form Components
const EducationForm = ({ onBack }) => {
  const [educationType, setEducationType] = useState('kindergarten')
  const [semesterMarks, setSemesterMarks] = useState([])
  const [formData, setFormData] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addSemester = () => {
    setSemesterMarks([...semesterMarks, { semester: semesterMarks.length + 1, marks: '', grade: '' }])
  }

  const updateSemester = (index, field, value) => {
    const updated = semesterMarks.map((sem, i) =>
      i === index ? { ...sem, [field]: value } : sem
    )
    setSemesterMarks(updated)
  }

  const removeSemester = (index) => {
    setSemesterMarks(semesterMarks.filter((_, i) => i !== index))
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // Collect all form data
      const educationData = {
        educationType,
        ...formData,
        semesterMarks: semesterMarks,
        submittedAt: new Date().toISOString()
      }

      console.log('Education data to submit:', educationData)

      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000))

      alert('✅ Education record added successfully!\n\nNote: This is currently stored locally. When connected to blockchain, it will be permanently recorded.')

      // Reset form and go back
      setFormData({})
      setSemesterMarks([])
      onBack()

    } catch (error) {
      console.error('Error submitting education record:', error)
      alert('❌ Failed to add education record. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderEducationFields = () => {
    switch (educationType) {
      case 'kindergarten':
        return (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>School Name</label>
              <input
                type="text"
                placeholder="e.g., Little Angels Kindergarten"
                value={formData.schoolName || ''}
                onChange={(e) => handleInputChange('schoolName', e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Start Year</label>
                <input
                  type="number"
                  placeholder="2010"
                  value={formData.startYear || ''}
                  onChange={(e) => handleInputChange('startYear', e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>End Year</label>
                <input
                  type="number"
                  placeholder="2012"
                  value={formData.endYear || ''}
                  onChange={(e) => handleInputChange('endYear', e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Overall Performance</label>
              <select
                value={formData.performance || ''}
                onChange={(e) => handleInputChange('performance', e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              >
                <option value="">Select Performance</option>
                <option value="excellent">Excellent</option>
                <option value="very_good">Very Good</option>
                <option value="good">Good</option>
                <option value="satisfactory">Satisfactory</option>
              </select>
            </div>
          </>
        )

      case 'primary':
      case 'secondary':
        return (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>School Name</label>
              <input
                type="text"
                placeholder="e.g., St. Xavier's School"
                value={formData.schoolName || ''}
                onChange={(e) => handleInputChange('schoolName', e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Class/Grade</label>
                <select
                  value={formData.grade || ''}
                  onChange={(e) => handleInputChange('grade', e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                >
                  <option value="">Select Class</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(grade => (
                    <option key={grade} value={grade}>Class {grade}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Academic Year</label>
                <input
                  type="text"
                  placeholder="2020-21"
                  value={formData.academicYear || ''}
                  onChange={(e) => handleInputChange('academicYear', e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Percentage (%)</label>
                <input
                  type="number"
                  placeholder="85.5"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.percentage || ''}
                  onChange={(e) => handleInputChange('percentage', e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Board</label>
              <select
                value={formData.board || ''}
                onChange={(e) => handleInputChange('board', e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              >
                <option value="">Select Board</option>
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="State Board">State Board</option>
                <option value="IB">IB</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </>
        )

      case 'college':
      case 'university':
        return (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Institution Name</label>
              <input type="text" placeholder="e.g., Indian Institute of Technology" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Degree</label>
                <select style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
                  <option>Bachelor of Technology (B.Tech)</option>
                  <option>Bachelor of Engineering (B.E.)</option>
                  <option>Bachelor of Science (B.Sc.)</option>
                  <option>Bachelor of Arts (B.A.)</option>
                  <option>Bachelor of Commerce (B.Com.)</option>
                  <option>Master of Technology (M.Tech)</option>
                  <option>Master of Science (M.Sc.)</option>
                  <option>Master of Business Administration (MBA)</option>
                  <option>Doctor of Philosophy (Ph.D.)</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Specialization</label>
                <input type="text" placeholder="e.g., Computer Science Engineering" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Start Year</label>
                <input type="number" placeholder="2020" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>End Year</label>
                <input type="number" placeholder="2024" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Overall CGPA</label>
                <input type="number" placeholder="8.5" min="0" max="10" step="0.01" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Percentage (%)</label>
                <input type="number" placeholder="85.0" min="0" max="100" step="0.1" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
              </div>
            </div>

            {/* Semester-wise Marks Section */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label style={{ fontWeight: '500', fontSize: '1.1rem' }}>Semester-wise Records</label>
                <button
                  type="button"
                  onClick={addSemester}
                  style={{ background: '#059669', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  + Add Semester
                </button>
              </div>

              {semesterMarks.map((sem, index) => (
                <div key={index} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: '#374151' }}>Semester {sem.semester}</h4>
                    <button
                      type="button"
                      onClick={() => removeSemester(index)}
                      style={{ background: '#dc2626', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>CGPA/Percentage</label>
                      <input
                        type="text"
                        placeholder="8.5 or 85%"
                        value={sem.marks}
                        onChange={(e) => updateSemester(index, 'marks', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Grade</label>
                      <select
                        value={sem.grade}
                        onChange={(e) => updateSemester(index, 'grade', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                      >
                        <option value="">Select Grade</option>
                        <option value="O">O (Outstanding)</option>
                        <option value="A+">A+ (Excellent)</option>
                        <option value="A">A (Very Good)</option>
                        <option value="B+">B+ (Good)</option>
                        <option value="B">B (Above Average)</option>
                        <option value="C">C (Average)</option>
                        <option value="D">D (Below Average)</option>
                        <option value="F">F (Fail)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={onBack} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#374151' }}>🎓 Add Education Record</h2>
      </div>

      <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {/* Education Type Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Education Level</label>
          <select
            value={educationType}
            onChange={(e) => setEducationType(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}
          >
            <option value="kindergarten">🧸 Kindergarten</option>
            <option value="primary">📚 Primary School (Class 1-5)</option>
            <option value="secondary">🎒 Secondary School (Class 6-12)</option>
            <option value="college">🏫 College/University (UG/PG)</option>
            <option value="university">🎓 Higher Studies (PhD/Research)</option>
          </select>
        </div>

        {renderEducationFields()}

        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? '#6b7280' : '#2563eb',
              color: 'white',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? '⏳ Adding Record...' : '📝 Add Education Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

const CertificationForm = ({ onBack }) => (
  <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
      <button onClick={onBack} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
        ← Back
      </button>
      <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#374151' }}>🏆 Add Certification</h2>
    </div>

    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Certification Name</label>
        <input type="text" placeholder="e.g., AWS Solutions Architect" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Issuing Organization</label>
        <input type="text" placeholder="e.g., Amazon Web Services" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Issue Date</label>
        <input type="date" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
      </div>

      <button style={{ background: '#059669', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem' }}>
        Add Certification
      </button>
    </div>
  </div>
)

const ExperienceForm = ({ onBack }) => (
  <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
      <button onClick={onBack} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
        ← Back
      </button>
      <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#374151' }}>💼 Add Work Experience</h2>
    </div>

    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Company Name</label>
        <input type="text" placeholder="e.g., Google Inc." style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Job Title</label>
        <input type="text" placeholder="e.g., Software Engineer" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Start Date</label>
          <input type="date" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>End Date</label>
          <input type="date" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Description</label>
        <textarea placeholder="Describe your role and responsibilities..." rows="4" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', resize: 'vertical' }} />
      </div>

      <button style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem' }}>
        Add Experience
      </button>
    </div>
  </div>
)

const AchievementForm = ({ onBack }) => (
  <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
      <button onClick={onBack} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
        ← Back
      </button>
      <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#374151' }}>🏅 Add Achievement</h2>
    </div>

    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Achievement Title</label>
        <input type="text" placeholder="e.g., First Place in Hackathon" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Organization/Event</label>
        <input type="text" placeholder="e.g., TechCrunch Disrupt" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Date</label>
        <input type="date" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Description</label>
        <textarea placeholder="Describe your achievement and its impact..." rows="4" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', resize: 'vertical' }} />
      </div>

      <button style={{ background: '#dc2626', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem' }}>
        Add Achievement
      </button>
    </div>
  </div>
)

// Simple Dashboard Component
const Dashboard = ({ currentView, setCurrentView }) => {
  const { isConnected, account } = useWallet()

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛡️</div>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#374151' }}>Connect Your Wallet</h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Please connect your wallet to access your blockchain professional profile.
        </p>
        <div style={{
          background: '#dbeafe',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <h3 style={{ color: '#1e40af', marginBottom: '1rem' }}>Why Connect?</h3>
          <ul style={{ textAlign: 'left', color: '#1e40af', fontSize: '0.9rem' }}>
            <li>• Secure, tamper-proof professional records</li>
            <li>• Verified education and certifications</li>
            <li>• Transparent work experience tracking</li>
            <li>• Immutable achievement records</li>
          </ul>
        </div>
      </div>
    )
  }

  // Render different views based on currentView
  if (currentView === 'education') {
    return <EducationForm onBack={() => setCurrentView('dashboard')} />
  }
  if (currentView === 'certification') {
    return <CertificationForm onBack={() => setCurrentView('dashboard')} />
  }
  if (currentView === 'experience') {
    return <ExperienceForm onBack={() => setCurrentView('dashboard')} />
  }
  if (currentView === 'achievement') {
    return <AchievementForm onBack={() => setCurrentView('dashboard')} />
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Welcome Header */}
      <div style={{
        background: 'linear-gradient(to right, #2563eb, #7c3aed)',
        color: 'white',
        padding: '2rem',
        borderRadius: '0.75rem',
        marginBottom: '2rem'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Welcome to Your Blockchain Profile
        </h1>
        <p style={{ color: '#bfdbfe' }}>
          Your professional credentials, secured and verified on the blockchain
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <div style={{ width: '8px', height: '8px', background: '#fbbf24', borderRadius: '50%' }}></div>
          <span style={{ fontSize: '0.875rem' }}>Profile Ready for Setup</span>
        </div>
      </div>

      {/* Statistics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {[
          { title: 'Education Records', count: 0, icon: '🎓', color: '#2563eb' },
          { title: 'Certifications', count: 0, icon: '🏆', color: '#059669' },
          { title: 'Work Experience', count: 0, icon: '💼', color: '#7c3aed' },
          { title: 'Achievements', count: 0, icon: '🏅', color: '#dc2626' }
        ].map((stat, index) => (
          <div key={index} style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>{stat.title}</p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#374151', margin: '0.5rem 0' }}>
                  {stat.count}
                </p>
              </div>
              <div style={{
                fontSize: '2rem',
                background: `${stat.color}15`,
                padding: '0.75rem',
                borderRadius: '0.5rem'
              }}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
          Quick Actions
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {[
            { title: 'Add Education', desc: 'Record your academic achievements', icon: '🎓', view: 'education' },
            { title: 'Add Certification', desc: 'Document professional certifications', icon: '🏆', view: 'certification' },
            { title: 'Add Experience', desc: 'Record your work history', icon: '💼', view: 'experience' },
            { title: 'Add Achievement', desc: 'Showcase your accomplishments', icon: '🏅', view: 'achievement' }
          ].map((action, index) => (
            <div key={index}
            onClick={() => setCurrentView(action.view)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              ':hover': { borderColor: '#3b82f6', background: '#f8fafc' }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6'
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.background = 'white'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              <div style={{ fontSize: '2rem' }}>{action.icon}</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '500', color: '#374151' }}>
                  {action.title}
                </h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                  {action.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        marginTop: '2rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
          Recent Activity
        </h3>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            No recent activity. Start by creating your profile and adding credentials!
          </p>
        </div>
      </div>
    </div>
  )
}

// Main App Component
const AppContent = () => {
  const [currentView, setCurrentView] = useState('dashboard')

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Header currentView={currentView} />
      <main>
        <Dashboard currentView={currentView} setCurrentView={setCurrentView} />
      </main>
    </div>
  )
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  )
}

export default App